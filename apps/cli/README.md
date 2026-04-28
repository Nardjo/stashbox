# stashit

CLI for [stashit](https://github.com/Nardjo/stashit) — save and search bookmarks from the terminal or your scripts.

## Install

```sh
npm install -g @n4rdjo/stashit
# or
npx @n4rdjo/stashit --help
```

## Setup

Point the CLI at your running stashit API:

```sh
stashit config set apiUrl http://localhost:3333
stashit config set apiKey <your-api-key>
```

Config is stored in `~/.stashit/config.json`.

## Commands

### `add <url>`

Save a new bookmark.

```sh
stashit add https://example.com
stashit add https://example.com --json
```

### `search <query>`

Semantic search across your bookmarks.

```sh
stashit search "typescript generics"
stashit search "ml papers" --type article --limit 5
stashit search "video tutorials" --min-score 0.5 --json
```

### `recent`

List recent bookmarks (ordered by save date).

```sh
stashit recent
stashit recent --limit 20 --tag dev
stashit recent --type youtube --json
```

### `get <id>`

Get a single bookmark by ID.

```sh
stashit get 550e8400-e29b-41d4-a716-446655440000
stashit get <id> --json
```

### `delete <id>`

Delete a bookmark.

```sh
stashit delete <id>
stashit delete <id> --json
```

### `refresh <id>`

Re-enrich a bookmark (re-fetch + re-tag + re-embed).

```sh
stashit refresh <id>
```

### `failed`

List bookmarks that failed enrichment.

```sh
stashit failed
stashit failed --limit 50 --json
```

### `tags`

List all tags and their bookmark count.

```sh
stashit tags
stashit tags --min-count 3
stashit tags --json
```

### `config`

Read and write local config.

```sh
stashit config set apiUrl http://localhost:3333
stashit config set apiKey sk-...
stashit config get apiUrl
```

## JSON output

Every command accepts `--json` for machine-readable output, useful in shell scripts or agent pipelines:

```sh
stashit search "typescript" --json | jq '.[0].url'
stashit recent --json | jq 'map(select(.tags | index("dev")))'
```

## Exit codes

| Code | Meaning                                               |
| ---- | ----------------------------------------------------- |
| `0`  | Success                                               |
| `1`  | Error (API unreachable, not found, config missing, …) |
