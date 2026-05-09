# Issue #40 - Semantic Search Bar

## Plan

- [x] RED: prove a distinct semantic search input is visible on the browse page.
- [x] GREEN: add the semantic search form shell.
- [x] RED: prove submitting a query calls search with the query and replaces the browse grid.
- [x] GREEN: wire semantic search callback and search-mode results.
- [x] RED: prove a loading state is shown while search is in flight.
- [x] GREEN: add semantic search pending state.
- [x] RED: prove empty semantic results show an empty state.
- [x] GREEN: add search empty state.
- [x] RED: prove clearing semantic search restores browse mode.
- [x] GREEN: add clear control and browse restore.
- [x] RED: prove active semantic query is reflected in the URL and restored on load.
- [x] GREEN: sync semantic search query to URL.
- [x] Refactor only after green.
- [x] Verify with web tests, typecheck, targeted lint, and build.
- [ ] Push branch and create draft PR linked with `Closes #40`.

## Scope

- App: `apps/web`.
- Public interface: Owner searches Bookmarks semantically from the main page.
- Search mode replaces the browse grid while active.
- User-facing copy: French.

## Review

- Added a dedicated semantic search form on the browse page.
- Submitting a query calls the route-provided `searchBookmarks` callback and swaps the browse grid for semantic results.
- Search mode hides pagination and the add-card, reuses `BookmarkCard` for results, supports loading, empty, clear, and URL restore via `?semantic=...`.
- Validation passed: `pnpm --filter @stashbox/web test`, `pnpm --filter @stashbox/web typecheck`, targeted `eslint`, `pnpm --filter @stashbox/web build`.
- Full `pnpm --filter @stashbox/web lint` remains blocked by existing import-sort errors in generated `app.config.timestamp_*.js` and unrelated files.
