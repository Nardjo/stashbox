# Issue #40 - Semantic Search Bar

## Plan

- [ ] RED: prove a distinct semantic search input is visible on the browse page.
- [ ] GREEN: add the semantic search form shell.
- [ ] RED: prove submitting a query calls search with the query and replaces the browse grid.
- [ ] GREEN: wire semantic search callback and search-mode results.
- [ ] RED: prove a loading state is shown while search is in flight.
- [ ] GREEN: add semantic search pending state.
- [ ] RED: prove empty semantic results show an empty state.
- [ ] GREEN: add search empty state.
- [ ] RED: prove clearing semantic search restores browse mode.
- [ ] GREEN: add clear control and browse restore.
- [ ] RED: prove active semantic query is reflected in the URL and restored on load.
- [ ] GREEN: sync semantic search query to URL.
- [ ] Refactor only after green.
- [ ] Verify with web tests, typecheck, targeted lint, and build.
- [ ] Push branch and create draft PR linked with `Closes #40`.

## Scope

- App: `apps/web`.
- Public interface: Owner searches Bookmarks semantically from the main page.
- Search mode replaces the browse grid while active.
- User-facing copy: French.

## Review

- Pending.
