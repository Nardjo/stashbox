# StashIt HTTP API

Single-user, API-key authenticated. All requests except `GET /` require an `Authorization: Bearer <key>` header.

> v1 reference. Auto-generated OpenAPI spec is on the roadmap.

## Authentication

Every protected endpoint expects:

```
Authorization: Bearer <plaintext-api-key>
```

API keys are created with the `key:create` ace command (see [SELF_HOSTING.md](./SELF_HOSTING.md)). The plaintext is shown **once** at creation; only a hash is stored.

Failures:

- `401 unauthorized` — missing or invalid header / unknown or revoked key.

## Endpoints

### `GET /`

Health check. Public, no auth.

**Response 200**

```json
{ "ok": true }
```

---

### `POST /bookmarks`

Create a bookmark. URL is normalized server-side (lowercased host, stripped tracking params, host aliases applied) and deduplicated by SHA-256 of the normalized URL.

**Body**

```json
{
  "url": "https://example.com/article",
  "title": "Optional title",
  "content": "Optional Safari Reader / extracted text",
  "sharedFrom": "ios-shortcut"
}
```

| Field        | Type                                                                                             | Required |
| ------------ | ------------------------------------------------------------------------------------------------ | -------- |
| `url`        | string (URL)                                                                                     | yes      |
| `title`      | string                                                                                           | no       |
| `content`    | string                                                                                           | no       |
| `sharedFrom` | enum: `ios-shortcut`, `chrome-extension`, `firefox-extension`, `cli`, `mcp`, `import-csv`, `api` | no       |

**Responses**

- `201 Created` — new bookmark, body is the full Bookmark object (see schema below). `enrichmentStatus` starts as `pending`; an enrichment job is enqueued and transitions it to `done`.
- `409 Conflict` — a bookmark with the same normalized URL already exists. Body is the existing bookmark.
- `422 Unprocessable Entity` — invalid payload (missing/invalid `url`, unknown `sharedFrom` value).
- `401 Unauthorized` — auth.

---

### `GET /bookmarks/:id`

Fetch a single bookmark by UUID.

**Responses**

- `200 OK` — the bookmark.
- `404 Not Found` — `{ "error": "not_found", "message": "Bookmark not found" }`.
- `401 Unauthorized` — auth.

---

### `DELETE /bookmarks/:id`

Hard-delete a bookmark.

**Responses**

- `204 No Content`
- `404 Not Found` — `{ "error": "not_found", "message": "Bookmark not found" }`.
- `401 Unauthorized` — auth.

---

### `GET /bookmarks`

List recent bookmarks. Excludes `failed`, `pending`, `enriching` — only `done` and `degraded` are returned.

**Query**

| Param    | Type                                                        | Default | Notes                          |
| -------- | ----------------------------------------------------------- | ------- | ------------------------------ |
| `limit`  | int 1-200                                                   | 50      |                                |
| `offset` | int ≥0                                                      | 0       |                                |
| `type`   | enum `tweet \| youtube \| article \| image \| pdf \| other` | —       | optional filter                |
| `tag`    | string                                                      | —       | exact tag match (single value) |

**Response 200**

```json
{ "results": [Bookmark, ...] }
```

Ordered by `savedAt DESC`.

---

### `GET /bookmarks/failed`

List bookmarks whose enrichment ended in `failed`. Separate path so failures never leak into the default listing.

**Query**: `limit`, `offset`, `type` — same as `GET /bookmarks`.

---

### `POST /bookmarks/:id/refresh`

Re-enqueue the enrichment pipeline for a bookmark. Resets `enrichmentStatus` to `pending` and clears the previous error.

**Responses**

- `202 Accepted` — `{ "id": "<uuid>" }`. The job is queued; poll `GET /bookmarks/:id` for completion.
- `404 Not Found`.

---

### `POST /search`

Semantic similarity search over `done` + `degraded` bookmarks. Filters are applied **before** the vector top-K so `type` / `tags` queries always return up to `limit` results when enough exist.

**Body**

```json
{
  "query": "kubernetes orchestration",
  "limit": 10,
  "minScore": 0.4,
  "type": "article",
  "tags": ["devops", "infra"]
}
```

| Field      | Type               | Default | Notes                          |
| ---------- | ------------------ | ------- | ------------------------------ |
| `query`    | string (1+ chars)  | —       | required                       |
| `limit`    | int >0             | 10      |                                |
| `minScore` | float 0–1          | 0.4     | raw cosine similarity cut      |
| `type`     | bookmark type enum | —       | optional                       |
| `tags`     | string[]           | —       | OR semantics (any tag matches) |

**Response 200**

```json
{
  "results": [
    {
      "id": "<uuid>",
      "url": "https://...",
      "title": "...",
      "description": "...",
      "tags": [...],
      "type": "article",
      "score": 0.87,
      "enrichmentStatus": "done",
      "savedAt": "2026-01-12T10:21:09.000Z"
    }
  ]
}
```

`score` is raw cosine similarity (`1 - cosine_distance`), clamped to `[0, 1]`. Higher = closer.

---

### `GET /tags`

List distinct tags with usage counts (over `done` + `degraded` bookmarks only).

**Query**

| Param      | Type | Default | Notes              |
| ---------- | ---- | ------- | ------------------ |
| `minCount` | int  | 1       | filter sparse tags |

**Response 200**

```json
{ "results": [{ "tag": "ml", "count": 12 }, ...] }
```

Ordered by count desc, then alphabetical.

## Bookmark schema

```ts
{
  id: string,                                        // UUID v4
  url: string,                                       // normalized
  urlHash: string,                                   // 64-char hex (SHA-256 of url)
  type: "tweet" | "youtube" | "article" | "image" | "pdf" | "other",
  title: string,
  description: string,
  tags: string[],
  ogImage: string | null,
  embedData: unknown | null,
  enrichmentStatus: "pending" | "enriching" | "done" | "degraded" | "failed",
  enrichmentError: string | null,
  enrichmentFailureReason: "url_dead" | "fetch_unavailable" | "llm_invalid_output" | "llm_provider_error" | "unknown" | null,
  enrichmentAttempts: number,
  enrichedAt: string | null,                         // ISO datetime
  embeddingSourceText: string | null,
  savedAt: string,                                   // ISO datetime
  savedCount: number,
  lastSavedAt: string,                               // ISO datetime
  savedFrom: ("ios-shortcut" | "chrome-extension" | "firefox-extension" | "cli" | "mcp" | "import-csv" | "api")[]
}
```

## Errors

All error responses follow:

```json
{
  "error": "<machine_code>",
  "message": "<human readable>",
  "details": {}
}
```

`details` is included for validation errors (422) and lists per-field issues.

## Rate limiting

None in v1. Single-user expected. Add a reverse proxy (Caddy, Traefik, nginx) if you expose the API publicly.

## Roadmap

- `PATCH /bookmarks/:id` — edit title, tags, description
- Hybrid search (BM25 + vector) — v1.x candidate
- OpenAPI spec auto-generation
