# Issue #41 - Bookmark Grid Pagination

## Plan

- [x] RED: prove initial browse data exposes page size and `hasMoreBookmarks`.
- [x] GREEN: return pagination metadata from the home loader.
- [x] RED: prove "Charger plus" fetches the next page with `offset: 48` and appends cards.
- [x] GREEN: add load-more callback, loading state, and append behavior.
- [x] RED: prove load trigger is hidden when the returned page is shorter than the limit.
- [x] GREEN: compute `hasMoreBookmarks` after each page.
- [x] RED: prove pagination state resets when filters change.
- [x] GREEN: reset loaded pages to the initial page on filter changes.
- [x] Refactor only after green.
- [x] Verify with web tests, typecheck, targeted lint, and build.
- [ ] Push branch and create draft PR linked with `Closes #41`.

## Scope

- App: `apps/web`.
- Public interface: Owner loads more Bookmarks from the main browse grid.
- Trigger: explicit "Charger plus" button.
- User-facing copy: French.

## Review

- `pnpm --filter @stashbox/web test` passed: 49 tests.
- `pnpm --filter @stashbox/web typecheck` passed.
- Targeted ESLint passed on modified web files.
- `pnpm --filter @stashbox/web build` passed.
- Full `pnpm --filter @stashbox/web lint` is blocked by pre-existing generated
  `apps/web/app.config.timestamp_*.js` import-sort errors and unrelated import
  order errors outside this change.
