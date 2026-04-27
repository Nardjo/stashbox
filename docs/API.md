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

- `POST /search` — semantic + keyword search with pgvector
- `GET /bookmarks` — paginated list, filter by tags / type / status
- `PATCH /bookmarks/:id` — edit title, tags, description
- OpenAPI spec auto-generation
