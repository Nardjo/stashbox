# stashit — Product Requirements Document

> Agent-first, self-hosted bookmarks. You own the data.

## 1. Vision

stashit is a single-user, self-hosted bookmark backend designed to be consumed primarily by AI agents and lightweight clients (CLI, MCP, browser extension, Apple Shortcut). It is **API-first**: there is no central web UI in v1. You save bookmarks from anywhere, and you retrieve them by asking questions in natural language to your agent of choice.

The promise is simple: **what you save is yours**. Your bookmarks live in your Postgres database, on your server, exportable at any time as a SQL dump or CSV. No vendor lock-in, no cloud, no third party reading your reading list.

## 2. Why this exists

Existing self-hosted bookmark managers (Linkding, Linkwarden, Karakeep, Wallabag) are all UI-centric. They treat the agent/API use case as an afterthought. stashit inverts the priority: the API is the product, the clients are thin shells around it. This makes stashit the natural memory layer for personal AI workflows — Claude, Cursor, custom agents — where you want to ask "*find me that article about diffusion models I saved last month*" and get back a usable answer in two seconds.

## 3. Non-goals (v1)

- No web UI. (Maybe later if real demand emerges.)
- No multi-user / team features. One instance = one person.
- No social features (sharing, public collections, comments).
- No mobile native app. (Apple Shortcut + browser extension cover the bases.)
- No full-text RAG over bookmark contents. (Retrieval is at the bookmark level, not the passage level.)

## 4. Core concepts

### 4.1 Bookmark

A bookmark is the durable, enriched representation of a URL the user wanted to remember. It is enriched once, asynchronously, after save:

```
url               normalized canonical URL
urlHash           SHA-256 of normalized URL (unique)
type              tweet | youtube | article | image | pdf | other
title             clean title (LLM-cleaned if needed)
description       2–3 sentence summary (LLM-generated)
tags              normalized, kebab-case, reused from existing vocabulary when possible
embedding         vector(1536), text-embedding-3-small by default
ogImage           preview image URL (no file storage on our side)
embedData         provider-specific JSON (oEmbed for Twitter/YouTube)
enrichmentStatus  pending | enriching | done | degraded | failed
enrichmentError   last error message if failed
enrichmentFailureReason  url_dead | fetch_unavailable | llm_invalid_output | llm_provider_error | unknown
enrichmentAttempts
enrichedAt
embeddingSourceText  exact text passed to the embedding model (Title / Type / Tags / Summary / Content excerpt). Persisted so re-embedding is possible without re-fetching.
savedAt
savedCount        incremented on dedupe attempts
lastSavedAt
savedFrom         text[] — distinct save sources (ios-shortcut, chrome-extension, cli, mcp, import-csv, api)
```

### 4.2 Pipeline

Saves are non-blocking. The API returns `201 Created` instantly with the bookmark ID and `enrichmentStatus: "pending"`. A background worker picks up the job and runs:

1. Detect type from URL pattern. URL-pattern-detected types (`youtube`, `tweet`, `pdf`, `image`) are authoritative — the LLM is told the type is fixed and is not asked to override it. Only `other` falls through to LLM classification.
2. Fetch + extract content — **skipped if the client already passed `content`** (Apple Shortcut via Safari Reader, Chrome extension via DOM access, both bypass paywalls/Cloudflare). Otherwise the worker calls the configured **Fetch provider** (default: Jina Reader at `r.jina.ai`, alternatives: `firecrawl`, `local`).
3. Call LLM (Vercel AI SDK) with extracted content (capped at 8000 input tokens) + existing tag vocabulary → structured JSON `{ title, description, tags[], type? }`.
4. Generate embedding from a structured text composition (`Title / Type / Tags / Summary / Content excerpt` where excerpt is the first ~2000 tokens of raw content). The composed text is persisted as `embeddingSourceText`.
5. Persist enriched bookmark, set status `done`.

**Tertiary terminal status**:
- `done` — full content was available, full enrichment succeeded.
- `degraded` — fetch failed gracefully (paywall, 401/403, timeout, TLS error, JS-only site); the worker fell back to Open Graph metadata only. The bookmark is searchable but with weaker tags/embedding. A future **Refresh** may promote it to `done`.
- `failed` — URL is dead (404/410/DNS NXDOMAIN/malformed) or the LLM step couldn't produce valid output. Stored with `enrichmentFailureReason` for filterable retry. **No automatic retry beyond the in-job attempt.** Excluded from semantic search and from list tools by default; surfaced via `list_failed` / `stashit failed`.

Transient infra errors (LLM rate-limit, provider 5xx) return the bookmark to `pending` for backoff replay (up to 3 times) — they are not `failed`.

### 4.3 Deduplication

URL normalization is synchronous at save time (no redirect-following): force `https://`, lowercase host, strip `www.`/`m.`/`mobile.`, apply hardcoded canonical aliases (`twitter.com → x.com`, `youtu.be/<id> → youtube.com/watch?v=<id>`), strip default ports / index files / trailing slash, keep path case, strip tracking params via the ClearURLs ruleset, sort remaining params, drop fragments **except** when they begin with `/` (legacy SPA routes). See [docs/adr/0001-url-normalization-as-bookmark-identity.md](./adr/0001-url-normalization-as-bookmark-identity.md). The hash is unique. A POST for an existing URL returns:

```http
409 Conflict
{
  "error": "bookmark_already_exists",
  "message": "This URL is already bookmarked",
  "bookmark": { ...existing bookmark... }
}
```

We also bump `savedCount` and `lastSavedAt` on conflict, and add the source to `savedFrom` if it's new — useful for surfacing "things you keep coming back to from multiple places". The 409 response reflects state **after** these updates so the client/agent sees the result of its action.

### 4.4 Tags

Tags are LLM-generated but **vocabulary-aware**: at enrichment time, the worker passes the current tag list to the model with an instruction to reuse existing tags whenever possible and only invent a new one when nothing fits. Tags are normalized (lowercase, kebab-case, singular). A `tags merge` command is provided to consolidate duplicates manually.

**New tag quarantine**: a tag invented for a single bookmark is *not* re-injected into the prompt for subsequent enrichments. It must appear on at least 2 distinct bookmarks before joining the active vocabulary. This is a single-user-friendly safeguard against typo/variant inflation.

**Tag merge** updates the canonical `tags` field on affected bookmarks but does **not** trigger re-embedding — `embedding` and `embeddingSourceText` stay frozen and consistent with each other. If drift becomes a problem, the **Owner** can run a global re-embed.

### 4.5 Search

Pure cosine similarity over pgvector in v1. Results expose the **raw cosine score** (0..1) so agents/clients can judge relevance. Default `min_score = 0.40` — coarse cut against noise, overridable per-call.

Filters (`type`, `tags`, `date range`) are applied **before** the vector top-K, so asking for `--type article` always returns up to K articles when enough exist. Multi-tag matching is **OR by default** (`--tags ml,video` matches bookmarks with either tag); AND is opt-in via an explicit flag.

`failed` bookmarks are excluded from semantic search and from the default list tools, exposed via `list_failed`. `degraded` bookmarks are included — they have valid (if weaker) embeddings.

Hybrid search (BM25 + vector with reciprocal rank fusion) is a v1.x candidate if quality plateaus.

## 5. Architecture

### 5.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend framework | AdonisJS 6 (TypeScript) | Owner's daily driver, Lucid ORM, queues, validation, ace commands. |
| Database | Postgres + pgvector | SQL portability, vector search in the same engine. |
| Queue | Redis + Bull (`@rlanz/bull-queue`) | Standard, reliable, observable. |
| AI orchestration | Vercel AI SDK | Multi-provider with one API, structured output via Zod. |
| Embedding model | `text-embedding-3-small` (1536 dims) | Best price/quality, fixed in schema. |
| LLM (default) | `claude-haiku-4-5` via Anthropic | Fast, cheap, structured output reliable. User can override. |
| Fetch provider (default) | Jina Reader (`r.jina.ai`) | Free, no key required, returns LLM-ready markdown. Alternatives: `firecrawl`, `local` (Node fetch + Readability — no external dep, but fails on paywalls/JS-only sites). |
| Hosting | Coolify (Docker) | Self-hosted, owner's existing infra. |

### 5.2 Repository layout (monorepo)

```
stashit/
├── apps/
│   ├── api/                AdonisJS backend
│   ├── extension/          Chrome extension (Vite + React + Manifest V3)
│   ├── cli/                `stashit` npm binary
│   └── mcp/                MCP server
├── packages/
│   ├── shared/             types, Zod schemas, URL normalize
│   └── api-client/         fetch wrapper used by cli, mcp, extension
├── tools/
│   └── shortcut/           Apple Shortcut + setup screenshots
├── docs/
│   ├── PRD.md
│   ├── SELF_HOSTING.md
│   ├── API.md
│   └── CONTRIBUTING.md
├── docker-compose.yml      Postgres + Redis + API for one-command boot
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Tooling: pnpm workspaces, Turborepo for build cache, Changesets for client package versioning.

### 5.3 Authentication

Named API keys. Each client (Shortcut, CLI, MCP, extension) gets its own key, hashed at rest, with `lastUsedAt` tracking and individual revocation. Header: `Authorization: Bearer <key>`. Generated via `node ace key:create <name>`.

### 5.4 Configuration (env)

```
# Core
DATABASE_URL=postgres://...
REDIS_URL=redis://...
APP_KEY=...

# AI
STASHIT_LLM_PROVIDER=anthropic   # anthropic|openai|google|openrouter|mistral|groq|ollama
STASHIT_LLM_MODEL=claude-haiku-4-5
STASHIT_LLM_API_KEY=sk-ant-...

STASHIT_EMBEDDING_PROVIDER=openai
STASHIT_EMBEDDING_MODEL=text-embedding-3-small
STASHIT_EMBEDDING_API_KEY=sk-...

STASHIT_FETCH_PROVIDER=jina      # jina|firecrawl|local
STASHIT_FETCH_API_KEY=           # optional for jina; required for firecrawl
```

Switching `STASHIT_EMBEDDING_*` does **not** auto-migrate existing embeddings. Run `node ace embedding:migrate` explicitly. See [docs/adr/0002](./adr/0002-single-embedding-space-with-explicit-migration.md).

## 6. Clients (v1)

### 6.1 Apple Shortcut
Receives a URL via the iOS share sheet, runs **Get Article Using Safari Reader** to extract clean content on-device (bypasses paywalls and Cloudflare since Safari is logged in), POSTs `{ url, title, content, sharedFrom: "ios-shortcut" }`. Displays "Saved ✓" or "Already saved" with the bookmark title.

### 6.2 Chrome Extension
Toolbar icon. Click → popup (320×400). The extension reads `document.title`, the readable content via Mozilla's Readability lib injected into the page, and POSTs the same payload as the Shortcut. UI shows enrichment status live (poll the bookmark for ~10s) so the user sees the tags appear before closing the popup.

### 6.3 CLI (`stashit`)
Published to npm. Commands:

```
stashit add <url>                 # POST a URL
stashit search "<query>" [-n 10]  # semantic search
stashit recent [-n 20] [--type article]
stashit tag <tag>                 # list bookmarks by tag
stashit get <id|url>
stashit delete <id>
stashit refresh <id>
stashit failed                    # list enrichment failures
stashit retry-failed              # bulk retry
stashit import <file.csv>
stashit export <file.csv>
stashit tags                      # list tags with counts
stashit stats
```

Config: `~/.stashit/config.json` with `{ apiUrl, apiKey }`.

### 6.4 MCP Server
Exposes 9 tools to MCP-compatible agents (Claude Desktop, Claude Code, Cursor):

```
save_bookmark(url)                                       # URL only — content is never accepted from an agent
search_semantic(query, limit?, type?, tags?, min_score?)
list_recent(limit?, type?)
list_by_tag(tag, limit?)
get_bookmark(id_or_url)
list_tags(min_count?)
list_failed(limit?, type?)
delete_bookmark(id)
refresh_bookmark(id)
```

`save_bookmark` accepts the URL only; the worker + Fetch provider handle acquisition. This prevents an agent from contaminating enrichment with hallucinated content. `search_semantic`, `list_recent`, `list_by_tag` exclude `failed` bookmarks by default; `degraded` bookmarks are included.

## 7. Import / Export

- **Import**: CSV. Columns: `url, title?, description?, tags?, created_at?`. Missing fields are filled by enrichment. Dedup applies. Enrichment jobs are queued in batches respecting LLM concurrency limits.
- **Export**: format inferred from target.
  - `<file>.csv` — minimal portable CSV (`url, title, description, tags, type, enrichment_status, saved_at`). Compatible with Linkding/Linkwarden/Pocket. Embeddings dropped.
  - `<file>.jsonl` — full-fidelity JSON Lines including `embedding`, `embeddingModel`, `embeddingDim`, `embeddingSourceText`, `enrichmentFailureReason`. Round-trip restorable into a stashit instance running the **same** embedding model. Mismatch → import refused (re-embedding is always explicit).
  - `<file>.sql` — convenience wrapper around `pg_dump`. Easiest local backup, schema-bound (not portable).
  - `<directory>/` — bundle: `bookmarks.csv` + `embeddings.jsonl` + `tags.csv`. Default for `stashit export` without an explicit target.
- All export formats carry an explicit version marker (`# stashit-export v1` or `{"_format": "stashit-jsonl", "version": 1, ...}`).

(Netscape HTML format — universal browser bookmark export — is a v1.x candidate.)

## 8. Failure handling

- Pipeline runs once. If a step fails after its in-job attempts, the bookmark lands in `degraded` (predictable failures: paywall, JS-only, timeout, TLS) or `failed` (URL dead, LLM produced invalid output, provider misconfigured). See [docs/adr/0003](./adr/0003-tertiary-enrichment-status-done-degraded-failed.md).
- `failed` carries a typed `enrichmentFailureReason` (`url_dead | fetch_unavailable | llm_invalid_output | llm_provider_error | unknown`) so retry can filter (e.g. retry all `llm_provider_error` after fixing a key, skip `url_dead`).
- Transient infra errors (LLM rate-limit, provider 5xx) return the bookmark to `pending` for backoff replay (up to 3 times) — they are not `failed`.
- `degraded` bookmarks are included in semantic search and list tools — they're useful, just weaker.
- `failed` bookmarks remain retrievable by URL/listing, surfaced via `list_failed` (MCP) / `stashit failed` (CLI).
- **Refresh** replays the full pipeline. If the new run would be strictly worse than the current state (e.g. a previously-`done` URL is now 404), Refresh is a no-op — current enrichment is preserved, error returned. Refresh increments `enrichmentAttempts` with no upper bound.
- No silent dropping. Every error is observable.

## 9. Deployment

```bash
git clone https://github.com/nardjo/stashit
cd stashit
cp .env.example .env       # edit values
docker compose up -d       # Postgres + Redis + API
```

For development:
```bash
pnpm install
pnpm dev                   # extension + cli + mcp in watch mode
```

Coolify-friendly: a single Dockerfile in `apps/api/` produces the deployable image.

## 10. Roadmap snapshot

**v1 (this PRD)** — API + CLI + MCP + Chrome extension + Apple Shortcut + CSV I/O, single-user, AGPL-3.0.

**v1.x candidates** — Netscape HTML import, hybrid search (BM25 + vector), Firefox extension, Ollama local provider tested end-to-end, multi-LLM-provider direct (without Vercel AI SDK), simple read-only browse UI if demand materializes.

**v2 (uncommitted)** — multi-user, team workspaces, public collections, dashboard. Only if there is real signal that this is wanted.
