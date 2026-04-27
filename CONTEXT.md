# Context

Domain glossary lives in [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md). This file captures *resolved domain decisions* that don't fit a glossary entry — the "how it actually works" answers we've reached during interviews.

## Content acquisition

- A **Bookmark** needs readable text content to be properly enriched (good **Tags**, useful **Embedding**).
- Two paths feed the **Pipeline** with content:
  1. **Client-provided content** — Apple Shortcut (Safari Reader) and Chrome Extension (Readability) extract the page client-side and pass it in the POST. This is the preferred path because it bypasses paywalls and Cloudflare for sites where the **Owner** is logged in.
  2. **Fetch provider** — when the client cannot provide `content` (CLI, import, MCP), the **Worker** calls a configurable **Fetch provider** to retrieve cleaned content.
- **Fetch provider** is a first-class **Provider** alongside **LLM provider** and **Embedding provider**, swappable via env (`STASHIT_FETCH_PROVIDER`).
- **Default Fetch provider: Jina Reader** (`r.jina.ai/<url>`). Gratis, no key required to start, returns LLM-ready markdown. Acceptable trade-off: visited URLs transit through a third party (content is not stored by Jina). The **Owner** can switch to `local` (Node `fetch` + `@mozilla/readability`) for zero external dependency, at the cost of failing on paywalled / JS-rendered / Cloudflare-protected sites.

## Failure modes during enrichment

The **Pipeline** distinguishes three terminal outcomes via **Enrichment status**:

- **`done`** — full content was available (client-provided OR Fetch provider succeeded), LLM produced **Tags** + description, **Embedding** computed from rich text.
- **`degraded`** — the **Fetch provider** could not return readable content, but a lightweight GET retrieved usable Open Graph metadata (`<title>`, `<meta og:*>`, `<meta description>`). The LLM enriched from those miettes; **Tags** are weaker, **Embedding** is computed from the available text. The **Bookmark** is searchable. A later **Refresh** may promote it to `done` if the underlying site becomes reachable or the **Owner** swaps **Fetch provider**.
- **`failed`** — even minimal metadata is unobtainable: URL returns 404, DNS fails, URL is malformed, or the LLM step itself errors after its in-job attempts. **Refresh** is the only escape. `list_failed` exists to surface these for **Owner** action — keep this list signal-rich, not noisy.

Rule of thumb: `failed` means "there is something for the **Owner** to investigate". If a category of failure is expected to keep happening (paywall on a site you don't have a session for), it belongs in `degraded`, not `failed`.

## URL identity & dedupe

Two URLs that produce the same **Normalized URL** are the same **Bookmark**. The **URL hash** is computed from the **Normalized URL** and is the system's uniqueness key — it must be stable across all clients and immutable once chosen.

**Normalization rules (v1):**

1. **Scheme**: force `https://` when the URL is `http://`. No probe at save time — if the site only exists in `http`, the **Owner** can pass `http://` explicitly and we keep it.
2. **Host**:
   - lowercase
   - strip leading `www.`
   - strip mobile subdomain prefixes: `m.`, `mobile.`
   - apply hardcoded canonical aliases: **`twitter.com` → `x.com`**, **`youtu.be/<id>` → `x.com/watch?v=<id>`** *(see note)*, plus future entries as needed. The canonical side is the destination.
3. **Path**:
   - keep case sensitivity (many sites are case-sensitive: GitHub, S3, etc.)
   - strip trailing `/` unless the path is exactly `/`
   - strip default index files: `/index.html`, `/index.php`, `/index.htm`
4. **Port**: strip `:80` for http and `:443` for https (default ports).
5. **Query string**:
   - strip tracking params using a maintained external list (ClearURLs rules, via lib — not hand-maintained)
   - sort remaining params alphabetically by key for hash stability
6. **Fragment**:
   - strip by default
   - **exception**: keep the fragment if it begins with `/` (legacy SPA "fragment-as-route", e.g. `#/dashboard/123`)

**Out of scope at save time**: following HTTP redirects to discover a canonical URL. Redirect-following would break the "instant 201" guarantee and add a network failure surface to the synchronous save path. All resolution work belongs in the async **Pipeline**.

> Note: the YouTube alias rewrites `youtu.be/<id>` to `youtube.com/watch?v=<id>` (not to `x.com`). Listed correctly here despite the typo origin.

## Embedding model lifecycle

The schema commits to a single **Embedding** dimension at any given time (`vector(N)` column, default `N = 1536` for `text-embedding-3-small`). All **Bookmarks** must share the same vector space — mixed-dimension cohabitation is rejected as architectural complexity that doesn't pay for itself in a single-**Owner** tool.

Migrating to a new **Embedding model** (different provider, different dimension, or simply a better 1536-dim model) is an **explicit, **Owner**-initiated** operation, not a silent runtime swap:

1. The **Owner** updates `STASHIT_EMBEDDING_*` env vars.
2. The **Owner** runs `node ace embedding:migrate` (name TBD — naming belongs to implementation).
3. The command drops the existing `embedding` column, recreates it at the new dimension if needed, and re-embeds every `done` / `degraded` **Bookmark** using the persisted `embeddingSourceText`.
4. **Refetching is NOT part of this migration** — the **Fetch provider** is not called. Migration is fast and avoids re-losing paywalled content.

To make this possible, the **Pipeline** persists the exact text it passed to the **Embedding provider** in a column `embeddingSourceText` (TEXT, nullable on `failed`). This is the structured composition `Title / Type / Tags / Summary / Content excerpt`. Storage cost is acceptable at single-user scale (~2–5 KB × bookmarks).

**Trade-off accepted**: this is a one-shot, downtime-bearing operation (search returns nothing — or stale-dim results — while the column is being repopulated). Acceptable because (a) it's rare, (b) it's **Owner**-controlled, (c) saves continue to work — they just queue with `pending` status until migration completes.

## Type detection

**Type** is determined cooperatively but with **URL-pattern authority over LLM judgement**:

- Step 1 of the **Pipeline** runs URL-pattern detection. If a pattern matches a canonical type (`youtube`, `tweet`, `pdf`, `image`), that type is locked. The LLM call (step 3) is told the type is fixed and is not asked to produce one — saving tokens and preventing it from contradicting structurally-reliable URL evidence.
- If pattern detection yields `other`, the LLM is asked to classify between `article` / `image` / `pdf` / `other` based on the fetched content.
- The LLM **cannot override a pattern-detected type**. A pattern saying "this URL is a YouTube video" is treated as ground truth.

Rationale: canonical URL patterns are structurally reliable — `youtube.com/watch?v=…` is never not a YouTube video, regardless of what the page contents look like. Allowing the LLM to override invites a class of bugs (e.g. classifying a tweet as an article because the embedded text was indistinguishable from prose).

If the **Owner** ever needs to manually correct a misclassified type (a Medium URL that actually serves a PDF, etc.), that is a post-v1 admin command (`stashit set-type`) — not a **Refresh** behavior. **Refresh** replays the same deterministic rules.

## Tag vocabulary

**Selection sent to the LLM during enrichment**: v1 sends the full **Tag vocabulary** to every enrichment call. Naive but acceptable up to a few hundred tags. We will revisit when the vocabulary grows beyond what fits comfortably in the prompt — strategies like top-K-by-frequency or semantic-retrieval-of-relevant-tags are deferred until the simple approach hurts.

**New tag adoption (quarantine)**: a **Tag** invented by the LLM for a single **Bookmark** does *not* enter the vocabulary injected into subsequent enrichment prompts. A tag must appear on at least **2 distinct Bookmarks** before it is treated as part of the **Tag vocabulary** and offered back to the model for reuse. This is a single-user-friendly heuristic against typo/variant inflation (e.g. `transformer-model` vs `transformer-models`) — themes that genuinely matter recur, ephemeral one-offs don't.

Rule applies only to the *prompt-injection step*. The tag is still stored on the originating **Bookmark** and visible via `stashit tags` / `list_tags`.

**Tag merge and embeddings**: `tags merge <from> <to>` updates the canonical `tags` field on affected **Bookmarks** but does **not** trigger a re-embed and does **not** rewrite `embeddingSourceText`. Both the **Embedding** and its source text remain frozen at the moment of the original enrichment — internally consistent with each other, slightly out of sync with the canonical `tags`. Trade-off accepted in favor of cheap, instant merges; the **Owner** can force a global re-embed if drift becomes a problem.

## Search semantics

Search returns ranked **Bookmarks** along with their **raw cosine similarity score** (0..1) so consuming clients (Agents in particular) can decide whether to act on a result. Score is an opaque float — no normalization, no human-friendly "relevance label", no reasoning text.

**Default `min_score`: 0.40.** Below that, results are usually noise for `text-embedding-3-small`. The CLI / MCP / API can override per-call. Rationale: in single-user use, the **Owner** prefers a few tangentially-related hits to zero results.

**Filter semantics (`type`, `tags`, `date range`):**

- Filters are applied **before** the vector top-K, not after. The query becomes "find the K most similar **Bookmarks** *within the subset matching these filters*". This guarantees that asking for `--type article` always returns up to K articles (assuming enough exist), rather than returning fewer because the global top-K happened not to contain articles. Slightly slower than post-filtering but semantically what the **Owner** expects.
- Multi-tag matching is **OR by default** (`--tags ml,video` returns **Bookmarks** with *either* tag), with **AND opt-in** via an explicit flag. OR fits the dominant single-user pattern of "broaden across angles"; AND is reserved for the rarer "precise intersection" use case.

`failed` **Bookmarks** are excluded from semantic search (per PRD). `degraded` **Bookmarks** are included — they have valid embeddings derived from their OG metadata.

## MCP write surface

The **MCP** server exposes a `save_bookmark(url)` tool in addition to the read/delete/refresh tools listed in the PRD (final count: **9 tools**, not 8).

The tool accepts only the URL — never `content`. Rationale: an LLM-driven **Agent** could pass hallucinated or biased summaries as `content`, which would silently contaminate **Enrichment**. Forcing the **Agent** to submit URL-only routes acquisition through the **Fetch provider** and preserves the same fidelity guarantee as the CLI / import paths.

This unlocks the natural agent loop: during a research session, the **Agent** finds a useful article via web search and offers to save it ("stash it"). The **Owner** confirms, the URL is queued, the **Pipeline** runs identically to any other save.

## Failure boundary (HTTP and LLM)

The boundary between `done`, `degraded` and `failed` is defined explicitly so the **Worker** never has to make ad-hoc judgements.

**Fetch step (Fetch provider or local fallback):**

| Outcome | **Enrichment status** |
|---|---|
| `200` with rich content | `done` (continue pipeline) |
| `200` with empty / near-empty body (< ~200 useful chars) | `degraded` (OG fallback) |
| `301` / `302` redirects | follow up to 5 hops, then evaluate final response |
| `400` / `404` / `410` | `failed` — URL is dead |
| `401` / `403` | `degraded` (paywall / Cloudflare expected; OG fallback) |
| `429` | one retry with backoff, then `degraded` |
| `5xx` (target site) | one retry, then `degraded` |
| Timeout (>30s) | `degraded` |
| DNS NXDOMAIN | `failed` |
| TLS / certificate error | `degraded` (attempt OG with permissive TLS as last resort) |
| Fetch provider itself errors (Jina down, not the target) | retry; if still failing, queue stays `pending` (infra issue, not a Bookmark issue) |

**LLM step:**

| Outcome | **Enrichment status** |
|---|---|
| Valid structured JSON | `done` (or `degraded` if the fetch leg already degraded) |
| Invalid JSON after one in-job retry | `failed` |
| Rate-limit / 5xx / transient provider error | **return to `pending`** with exponential backoff, up to 3 replays. Not `failed` — it isn't the **Bookmark**'s fault, and pollution of `list_failed` would erode its value. |
| Auth error (key invalid, quota exhausted permanently) | `failed` + global operator log — the **Owner** must intervene at the env-var level |

The "no automatic retry beyond the in-job attempt" rule from the PRD applies to the **Pipeline as a whole** after it has terminated. Intra-pipeline retries on transient infra errors (rate limits, 5xx from a provider) are not "Pipeline retries" — they're part of finishing the original attempt.

## Failure reason taxonomy

Alongside the freeform `enrichmentError` message, every `failed` **Bookmark** carries a typed `enrichmentFailureReason`:

- `url_dead` — 404, 410, DNS NXDOMAIN, malformed URL
- `fetch_unavailable` — TLS error, timeout exhausted, fetch provider exhausted retries
- `llm_invalid_output` — LLM returned non-conforming JSON
- `llm_provider_error` — auth invalid, quota permanently exhausted, provider misconfigured
- `unknown` — fallback for unclassifiable failures

This lets `list_failed --reason <r>` and bulk-retry filter by category (e.g. retry `llm_provider_error` after fixing the key, but not `url_dead`).

## Export contract

The export is the **load-bearing promise** of stashit ("what you save is yours"). It must let the **Owner** (a) walk away to another tool with as much data as that tool can absorb, and (b) restore a stashit instance bit-for-bit without re-paying enrichment costs.

`stashit export <target>` infers format from the target:

- `<file>.csv` — minimal portable CSV: `url, title, description, tags, type, enrichment_status, saved_at`. Same columns as the import format. Compatible with Linkding / Linkwarden / Pocket. **Embeddings and `embeddingSourceText` are NOT included.** Re-importing into stashit triggers full **Enrichment**.
- `<file>.jsonl` — full-fidelity JSON Lines: every column of the **Bookmark** including `embedding`, `embeddingModel`, `embeddingSourceText`, `enrichmentFailureReason`, etc. Designed for round-trip restoration into a stashit instance running the same **Embedding model**.
- `<file>.sql` — convenience wrapper around `pg_dump`. Documented as the "easiest backup" path but not the canonical export for portability — it is schema-bound.
- `<directory>/` — writes the bundle: `bookmarks.csv` + `embeddings.jsonl` + `tags.csv`. Default for `stashit export` without a target. Best of both worlds: portable CSV for migration, JSONL for lossless restore.

**Format versioning**: every export carries an explicit version marker.
- CSV: comment line `# stashit-export v1` as first line (ignored by Excel / spreadsheet tools, read by `stashit import`).
- JSONL: first line is a metadata record `{"_format": "stashit-jsonl", "version": 1, "embeddingModel": "...", "embeddingDim": 1536, "exportedAt": "..."}`.

The import reads the version and either applies a migration (future-self problem) or refuses cleanly with a clear error.

**Embedding-model mismatch on import**: if the JSONL declares `embeddingModel: A` but the current instance is configured with `embeddingModel: B` (different model or different dimension), the import **refuses**. The **Owner** must either (a) restore the env to model A first, or (b) import the CSV form instead and accept full re-**Enrichment** cost. This stays consistent with the rule that re-embedding is always an explicit, **Owner**-initiated operation — never silent.

## Save provenance

A **Bookmark** records the *set of distinct sources* it has ever been saved from, alongside the existing counters.

- `savedFrom: text[]` — distinct values, dedup-on-insert. Saving the same URL five times from the Shortcut yields `["ios-shortcut"]`, not five entries. Resaving from a new surface adds to the set.
- `savedAt`, `lastSavedAt`, `savedCount` keep their PRD-defined semantics (`savedAt` = first save, `lastSavedAt` = most recent save, `savedCount` incremented on every dedupe).

This gives the strongest signal-to-cost ratio for single-user use: "things I keep stumbling back into across multiple surfaces" is the real value of provenance tracking. A full event log (table of `save_events`) is overkill for v1 — defer until telemetry/audit is an actual goal.

**Canonical `savedFrom` values (enum):**

```
ios-shortcut
chrome-extension
firefox-extension     # reserved for v1.x
cli
mcp
import-csv
api                   # fallback for raw POSTs without a recognized client identifier
```

Identification precedence at the API: an `X-Stashit-Client` header takes priority; if absent, the **API key** name is mapped (e.g. a key named `shortcut-iphone` → `ios-shortcut`); if neither yields a known value, the source defaults to `api`.

**Dedupe response (`409 Conflict`)**: the returned `bookmark` reflects state **after** the dedupe-side updates have been applied (`savedCount + 1`, `lastSavedAt = now`, `savedFrom` augmented if the source is new). The `409` is an acknowledgement of the save action, not a refusal — the caller should see the result of its action, including the updated counters. UX consequence: clients can display "Already saved (3 times now)" or similar.

## API key authority (v1)

All **API keys** are root: any key can perform any operation (save, search, get, list, delete, refresh, export, admin). v1 deliberately ships without scopes.

Rationale: single-user, self-hosted, **Owner** controls every issued key. Adding scopes prematurely would be ceremony for a threat model that doesn't yet exist (no team, no third-party integrations). If the model evolves — e.g. a public-facing **Agent** that should not be allowed to delete — scopes can be added in a backward-compatible way (existing keys default to root, new keys opt into a narrower set). Treating this as a deferrable decision rather than a permanent one.

The risk accepted: if any single key leaks, the entire **Bookmark** corpus can be wiped or exfiltrated. Mitigations the **Owner** owns: per-client keys (already specified), `lastUsedAt` for anomaly detection, individual revocation via `node ace key:revoke <name>`.

## Content size handling

Long-form content (papers, long-reads, dense Substacks) routinely exceeds usable LLM input budgets. v1 caps everything aggressively rather than building hierarchical summarization machinery.

**LLM tagging/description step**: hard cap at **8000 input tokens**. If the fetched content exceeds the cap, it is truncated to the first 8000 tokens (head-only). No summary-of-summary, no middle-out sampling — those are deferred until quality plateaus measurably.

**Embedding source composition**: the `embeddingSourceText` is built as `Title / Type / Tags / Summary / Content excerpt` where:
- `Summary` is the LLM-generated description (already a high-quality compressed semantic representation)
- `Content excerpt` is the first ~2000 tokens of the raw fetched content

This combination follows the Contextual Retrieval intuition: the LLM summary captures intent, the raw excerpt preserves concrete grain (proper nouns, jargon, specific terms the summary would smooth out). Together they fit comfortably under the embedding model's 8191-token cap.

**Raw content is NOT persisted.** The fetched content lives only in the **Pipeline**'s memory for the duration of one job, then is dropped. Strictly aligned with the v1 non-goal "no full-text RAG over bookmark contents". If the **Owner** ever wants passage-level retrieval, refetching is the cost of admission — acceptable given the rarity of the use case in single-user mode. Optional persistence (env-flag opt-in) is a v1.x conversation if that pattern actually emerges.

## Refresh semantics

**Refresh** re-runs the full **Pipeline** for a single **Bookmark**. v1 rules:

- **Overwrites everything derived**: `title`, `description`, `tags`, `type`, `embedding`, `enrichmentStatus` are all replaced by the new run. `savedAt`, `savedCount`, `lastSavedAt`, `urlHash` are preserved. v1 has no manual edits to protect, so there is no "merge" logic.
- **Never destructive**: if the new run would produce a strictly worse outcome than the current state — typically the URL is now dead (404 / DNS fail) on a previously-`done` or `degraded` **Bookmark** — **Refresh** is a no-op. The existing enrichment is preserved and the call returns a clear error ("Refresh failed: URL no longer reachable, bookmark left unchanged"). A `failed` **Bookmark** has nothing to preserve, so a still-failing **Refresh** simply re-stamps `enrichmentError` and increments `enrichmentAttempts`.
- **No attempt cap**: every **Refresh** increments `enrichmentAttempts`, but there is no upper bound. All retries are **Owner**-initiated, so the **Owner** decides when to stop. The counter remains useful for surfacing chronically-broken **Bookmarks** (`list_failed` could be sorted by it).
