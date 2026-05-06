# Ubiquitous Language

## Bookmark lifecycle

| Term                  | Definition                                                                                                                                                                | Aliases to avoid                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Bookmark**          | Durable, enriched representation of a URL the user wanted to remember                                                                                                     | Link, entry, item, saved-url                              |
| **Save**              | The act of submitting a URL to stashbox for storage                                                                                                                       | Add, create, post                                         |
| **Enrichment**        | The async pipeline that derives title, description, tags, type, and embedding                                                                                             | Processing, hydration, ingestion                          |
| **Enrichment status** | Current state of enrichment for a bookmark: `pending`, `enriching`, `done`, `degraded`, `failed`                                                                          | Job state, processing state                               |
| **Degraded**          | A **Bookmark** whose **Pipeline** completed but with reduced-quality inputs (e.g. only OG metadata, no full content). Searchable, but a future **Refresh** may improve it | Partial, incomplete                                       |
| **Refresh**           | Explicit user-initiated re-run of enrichment for a bookmark                                                                                                               | Reprocess, re-enrich, retry (when scoped to one bookmark) |
| **Dedupe**            | Detection of an already-saved URL via normalized URL hash; bumps `savedCount`                                                                                             | Conflict, duplicate check                                 |

## URL identity

| Term               | Definition                                                                                   | Aliases to avoid            |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------- |
| **Normalized URL** | Canonical URL with tracking params, fragments stripped and host lowercased                   | Cleaned URL, canonical link |
| **URL hash**       | SHA-256 of the normalized URL; uniqueness key for bookmarks                                  | Fingerprint, dedupe key     |
| **Type**           | Content classification of a bookmark: `tweet`, `youtube`, `article`, `image`, `pdf`, `other` | Kind, category, format      |

## Knowledge & retrieval

| Term                | Definition                                                                                           | Aliases to avoid         |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ |
| **Tag**             | LLM-generated, kebab-case, singular label drawn from existing **tag vocabulary** when possible       | Label, keyword, topic    |
| **Tag vocabulary**  | The full set of tags currently in use, passed to the LLM during enrichment to encourage reuse        | Taxonomy, tag pool       |
| **Embedding**       | 1536-dim vector (text-embedding-3-small) computed from a structured text composition of the bookmark | Vector, representation   |
| **Semantic search** | Cosine-similarity retrieval over embeddings; excludes `failed` bookmarks by default                  | Vector search, AI search |

## Actors & clients

| Term        | Definition                                                                        | Aliases to avoid           |
| ----------- | --------------------------------------------------------------------------------- | -------------------------- |
| **Owner**   | The single human who self-hosts and uses the instance (v1 is single-user)         | User, account, admin       |
| **Client**  | A program that talks to the stashbox API (Shortcut, Extension, CLI, MCP)          | App, consumer, integration |
| **Agent**   | An LLM-driven client (e.g. Claude Desktop) that consumes stashbox via MCP         | Bot, AI                    |
| **API key** | Named, hashed credential issued per client, sent as `Authorization: Bearer <key>` | Token, secret, password    |

## Infrastructure

| Term               | Definition                                                                                                                                                     | Aliases to avoid          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Pipeline**       | The ordered sequence of enrichment steps run by the worker for one bookmark                                                                                    | Flow, chain               |
| **Worker**         | Background process that consumes jobs from the queue and runs the **pipeline**                                                                                 | Job runner, processor     |
| **Provider**       | A configurable, swappable backend for one stage of the **Pipeline**. Three kinds: **LLM provider**, **Embedding provider**, **Fetch provider**                 | Vendor, backend           |
| **Fetch provider** | Provider that turns a URL into readable text content when the client hasn't supplied it. Default: Jina Reader. Alternative: `local` (Node fetch + Readability) | Scraper, crawler, fetcher |

## Relationships

- An **Owner** issues many **API keys**, one per **Client**.
- A **Client** posts a URL → the API creates a **Bookmark** with status `pending`.
- The **Worker** runs the **Pipeline** on a **Bookmark**, producing **Tags**, an **Embedding**, and a final **Enrichment status**.
- A **Save** for an existing **URL hash** triggers **Dedupe**, not a new **Bookmark**.
- **Semantic search** queries the **Embedding** of every `done` **Bookmark**.
- A `failed` **Bookmark** is invisible to **Semantic search** but still retrievable by URL / listing, and can be **Refresh**ed.

## Example dialogue

> **Dev:** When the Apple Shortcut posts a URL, do we run the **Pipeline** before responding?

> **Domain expert:** No — the API persists the **Bookmark** with `enrichmentStatus: pending` and returns `201` immediately. The **Worker** picks the job up and runs the **Pipeline** asynchronously.

> **Dev:** And if the same URL is posted again from the Chrome extension?

> **Domain expert:** That's a **Dedupe**. The **URL hash** matches an existing **Bookmark**, so we return `409` with the existing **Bookmark** and bump `savedCount` and `lastSavedAt`. No new row, no re-**Enrichment**.

> **Dev:** What if the LLM step fails during the **Pipeline**?

> **Domain expert:** The **Bookmark** is marked `failed` with the error stored. It stays in the system — listable, retrievable by URL — but excluded from **Semantic search**. The **Owner** can call `refresh_bookmark` to re-run the **Pipeline**.

> **Dev:** And the **Tags** the LLM produces — are they free-form?

> **Domain expert:** No. We pass the current **Tag vocabulary** into the prompt so the model reuses existing **Tags** when it can. New ones only appear when nothing fits, and they're normalized to kebab-case singular.

## Flagged ambiguities

- **"User" vs "Owner"**: The PRD uses "user" generically. In v1 there is exactly one human per instance — call them the **Owner**. Reserve "user" for v2 multi-user discussions to avoid confusion.
- **"Retry"**: Used in two distinct senses — (1) in-job pipeline attempts before a **Bookmark** becomes `failed`, and (2) explicit re-runs via `refresh_bookmark` / `stashbox retry-failed`. Prefer **attempt** for (1) and **Refresh** for (2).
- **"Tag" the noun vs `tag` the CLI verb**: `stashbox tag <tag>` is a _list-by-tag_ command, not a tagging action. Document it as "list by **Tag**" — bookmarks are never manually tagged in v1; **Tags** are produced by **Enrichment**.
- **"Status"**: `enrichmentStatus` is the only status concept in v1. Don't introduce "bookmark status" or "job status" as parallel terms.
