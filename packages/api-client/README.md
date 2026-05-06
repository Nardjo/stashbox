# @stashbox/api-client

Typed fetch wrapper for the stashbox API. Used internally by the `stashbox` CLI and MCP server.

## Install

```sh
pnpm add @stashbox/api-client
```

## Usage

```ts
import { StashboxClient } from "@stashbox/api-client";

const client = new StashboxClient({
  baseUrl: "http://localhost:3333",
  apiKey: "your-api-key",
});

const results = await client.search({ query: "typescript generics" });
const recent = await client.list({ limit: 20, tag: "dev" });
const bookmark = await client.add({ url: "https://example.com" });
```

## API

| Method            | Description                            |
| ----------------- | -------------------------------------- |
| `search(params)`  | Semantic search — returns `Bookmark[]` |
| `list(params?)`   | Recent bookmarks with optional filters |
| `failed(params?)` | Bookmarks that failed enrichment       |
| `get(id)`         | Single bookmark by ID                  |
| `add(params)`     | Create a bookmark                      |
| `delete(id)`      | Delete a bookmark                      |
| `refresh(id)`     | Re-queue enrichment                    |
| `tags(minCount?)` | All tags with bookmark counts          |

All methods throw on non-2xx responses with the API's `error` string as the message.

## Custom fetch

Inject a custom `fetch` for testing or edge runtimes:

```ts
const client = new StashboxClient({ baseUrl, apiKey, fetch: customFetch });
```
