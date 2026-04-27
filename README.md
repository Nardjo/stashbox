# stashit

> Agent-first, self-hosted bookmarks. You own the data.

stashit is a single-user, self-hosted bookmark backend designed to be consumed primarily by AI agents and lightweight clients (CLI, MCP, browser extension, Apple Shortcut). API-first: there is no central web UI in v1.

**Status: pre-alpha — under active development. See [docs/PRD.md](./docs/PRD.md) for the full spec and [issues](https://github.com/Nardjo/stashit/issues) for what's being built.**

## Why

Existing self-hosted bookmark managers (Linkding, Linkwarden, Karakeep) are UI-centric. stashit inverts the priority: the API is the product, the clients are thin shells around it. It is the natural memory layer for personal AI workflows — ask your agent *"find me that article about diffusion models I saved last month"* and get a usable answer.

## Planned clients

- HTTP API (AdonisJS + Postgres + pgvector)
- CLI: `stashit add | search | recent | tag | ...`
- MCP server for Claude Desktop / Code / Cursor
- Chrome extension
- Apple Shortcut

## License

[AGPL-3.0](./LICENSE) — self-host freely, but redistributed/SaaS forks must stay open.
