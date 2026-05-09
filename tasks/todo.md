# Issue #38 - Delete Bookmark

## Plan

- [x] RED: prove cancelling the delete confirmation keeps the bookmark and does not call delete.
- [x] GREEN: add a delete button and confirmation dialog with cancel behavior.
- [x] RED: prove confirming delete calls the delete action and removes the card without page reload.
- [x] GREEN: wire `deleteBookmark` through the browse page and update local grid state.
- [x] RED: prove the delete button is disabled while deletion is in flight.
- [x] GREEN: add in-flight state and accessible disabled UI.
- [x] Refactor only after green.
- [x] Verify with web tests, typecheck, and targeted lint.
- [ ] Push branch and create draft PR linked with `Closes #38`.

## Scope

- App: `apps/web`.
- Public interface: user interacts with `BookmarkBrowsePage` / `BookmarkCard`.
- User-facing copy: French.

## Review

- `pnpm --filter @stashbox/web test` passed: 9 files, 40 tests.
- `pnpm --filter @stashbox/web typecheck` passed.
- Targeted ESLint passed on changed web files.
- Prettier check passed on changed files.
- Full `pnpm --filter @stashbox/web lint` is blocked by existing generated `app.config.timestamp_*.js` import-sort errors outside this change.
