# stashbox

CLI for [stashbox](https://github.com/Nardjo/stashbox) — save and search bookmarks from the terminal or your scripts.

## Install

```sh
npm install -g @n4rdjo/stashbox
# or
npx @n4rdjo/stashbox --help
```

## Setup

Point the CLI at your running stashbox API:

```sh
stashbox config set apiUrl http://localhost:3333
stashbox config set apiKey <your-api-key>
```

Config is stored in `~/.stashbox/config.json`.

## Commands

### `add <url>`

Save a new bookmark.

```sh
stashbox add https://example.com
stashbox add https://example.com --json
```

### `search <query>`

Semantic search across your bookmarks.

```sh
stashbox search "typescript generics"
stashbox search "ml papers" --type article --limit 5
stashbox search "video tutorials" --min-score 0.5 --json
```

### `recent`

List recent bookmarks (ordered by save date).

```sh
stashbox recent
stashbox recent --limit 20 --tag dev
stashbox recent --type youtube --json
```

### `get <id>`

Get a single bookmark by ID.

```sh
stashbox get 550e8400-e29b-41d4-a716-446655440000
stashbox get <id> --json
```

### `delete <id>`

Delete a bookmark.

```sh
stashbox delete <id>
stashbox delete <id> --json
```

### `refresh <id>`

Re-enrich a bookmark (re-fetch + re-tag + re-embed).

```sh
stashbox refresh <id>
```

### `failed`

List bookmarks that failed enrichment.

```sh
stashbox failed
stashbox failed --limit 50 --json
```

### `tags`

List all tags and their bookmark count.

```sh
stashbox tags
stashbox tags --min-count 3
stashbox tags --json
```

### `config`

Read and write local config.

```sh
stashbox config set apiUrl http://localhost:3333
stashbox config set apiKey sk-...
stashbox config get apiUrl
```

## JSON output

Every command accepts `--json` for machine-readable output, useful in shell scripts or agent pipelines:

```sh
stashbox search "typescript" --json | jq '.[0].url'
stashbox recent --json | jq 'map(select(.tags | index("dev")))'
```

## Exit codes

| Code | Meaning                                               |
| ---- | ----------------------------------------------------- |
| `0`  | Success                                               |
| `1`  | Error (API unreachable, not found, config missing, …) |
