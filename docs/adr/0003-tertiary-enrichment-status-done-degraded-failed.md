# Tertiary enrichment status: done, degraded, failed

The **Enrichment status** state machine is `pending → enriching → { done | degraded | failed }`. The PRD originally proposed only `done` / `failed`; we are adding `degraded` as a first-class terminal state with its own semantics, plus a typed `enrichmentFailureReason` enum for the `failed` case.

## Decision

`failed` is reserved for situations where the **Owner** can plausibly do something: a dead URL (404, DNS NXDOMAIN, malformed), an LLM that won't produce valid JSON, or a misconfigured provider key. `degraded` covers the predictably-imperfect cases — paywalls (401/403), Cloudflare blocks, JS-only sites, slow timeouts — where the **Pipeline** still produced a usable **Bookmark** from Open Graph metadata alone, with weaker **Tags** and a thinner **Embedding**. `degraded` **Bookmarks** are searchable and listable like `done`; only their quality differs, and a future **Refresh** (or **Fetch provider** swap) may promote them.

`enrichmentFailureReason` is a closed enum (`url_dead`, `fetch_unavailable`, `llm_invalid_output`, `llm_provider_error`, `unknown`) so `list_failed` and bulk-retry can filter sensibly.

## Considered alternatives

- **Binary `done | failed` (PRD original)**. Rejected: collapses two very different signals. Paywalls would either pollute `list_failed` (eroding its value as a "fix me" queue) or hide as-if-successful **Bookmarks** with empty tags (eroding search quality). Neither is acceptable.
- **Boolean `enrichmentDegraded` flag alongside `done`**. Rejected: a flag is easy to forget at query sites; a status enum forces every consumer to think about which buckets it includes (e.g. `search_semantic` includes `done` and `degraded`, excludes `failed`).
- **Free-form `enrichmentError` only, no typed reason**. Rejected: blocks `list_failed --reason llm_provider_error`-style filtering, which is the natural way for the **Owner** to recover after fixing an env-var issue.

## Consequences

- Search and list tools must explicitly choose their inclusion set across the three statuses. v1 default: `search_semantic` and the `list_*` family include `done` + `degraded`, exclude `failed`. `list_failed` is the only entry point for `failed` **Bookmarks**.
- The HTTP-to-status mapping (e.g. `401 → degraded`, `404 → failed`, `5xx → retry-then-degraded`) is documented in `CONTEXT.md § Failure boundary` and must be implemented uniformly across all **Fetch providers**, not re-derived per provider.
- Adding new failure reasons is a backward-compatible change (additive enum). Removing or repurposing one is breaking and should re-open this ADR.
