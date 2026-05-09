# Issue #39 - Bookmark Filter Bar

## Plan

- [x] RED: prove the home loader fetches Tags with Bookmarks.
- [x] GREEN: expose Tags to the browse page.
- [x] RED: prove text filtering narrows Bookmarks by title or URL.
- [x] GREEN: add filter bar text input and client-side filtering.
- [x] RED: prove type filtering narrows Bookmarks by selected Type.
- [x] GREEN: add Type select.
- [x] RED: prove selected Tags filter with OR semantics and combine with text/type by AND.
- [x] GREEN: add Tag multi-select.
- [x] RED: prove clearing filters restores the full grid and URL query reflects active filters.
- [x] GREEN: wire filter state to query string.
- [x] Refactor only after green.
- [x] Verify with web tests, typecheck, targeted lint, and formatting.
- [ ] Push branch and create draft PR linked with `Closes #39`.

## Scope

- App: `apps/web`.
- Public interface: Owner filters Bookmarks from the main browse page.
- User-facing copy: French.

## Review

- `pnpm --filter @stashbox/web test` passed: 45 tests.
- `pnpm --filter @stashbox/web typecheck` passed.
- Targeted ESLint passed on modified web files.
- `pnpm --filter @stashbox/web build` passed.
- Full `pnpm --filter @stashbox/web lint` is blocked by pre-existing generated
  `apps/web/app.config.timestamp_*.js` import-sort errors and unrelated import
  order errors outside this change.
