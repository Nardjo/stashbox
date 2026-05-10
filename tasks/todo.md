# Pending Enrichment Diagnosis

## Plan

- [x] Confirm the current Bookmark statuses and queue state.
- [x] Check whether the enrichment worker is running against the same Redis/API environment.
- [x] Identify the blocking dependency if the worker is running but jobs stay pending.
- [x] Apply the smallest code or dev setup fix when needed.
- [x] Verify a saved Bookmark leaves `pending`.

## Scope

- Apps: `apps/api`, `apps/web` only if UI status display needs adjustment.
- Symptom: all visible Bookmarks remain `pending` after save.
- User-facing copy stays French.

## Review

- Root cause: local `pnpm dev` started the API server but not the BullMQ enrichment worker.
- Redis had four `enrichment` jobs waiting and no active worker; bookmarks stayed at `pending` with zero attempts.
- Running `node ace queue:listen` consumed the queue and moved the current bookmark to `done`.
- Updated the API dev script so future `pnpm dev` launches both `ace serve --hmr` and `ace queue:listen`.
- Validation passed: worker consumed queued jobs, Redis wait queue is empty, current API list returns `done`, `node --check`, API typecheck, targeted ESLint, and temporary dev launch on port `3399`.

---

# Show Pending Saves

## Plan

- [x] Confirm why an already-saved bookmark is absent from the page.
- [x] Include pending/enriching bookmarks in the main bookmark list.
- [x] Keep failed bookmarks out of the main list.
- [x] Update API regression coverage.
- [x] Verify the duplicate URL appears after save.

## Scope

- Apps: `apps/api`, `apps/web`.
- Symptom: duplicate save says already saved, but main page shows no bookmark.

## Review

- Root cause: `GET /bookmarks` only returned `done/degraded`, while new saves and duplicates can still be `pending`.
- Updated the main list to include `pending/enriching/done/degraded` and keep `failed` out of the normal browse list.
- Added a card fallback title using the domain when enrichment has not populated a title yet.
- Validation passed: API list test, API typecheck, web tests, web typecheck, web build, web e2e, targeted ESLint, and Playwright check against `http://localhost:5174`.

---

# Save Duplicate Feedback

## Plan

- [x] Reproduce the save failure and capture the real API/server response.
- [x] Identify whether the URL is invalid, API unavailable, or duplicate.
- [x] Replace misleading generic failure for known duplicate saves.
- [x] Add regression coverage for the duplicate-save path.
- [x] Verify the same URL in the browser.

## Scope

- App: `apps/web`.
- Symptom: saving a bookmark shows `Impossible de sauvegarder le Bookmark.`
- User-facing copy stays French.

## Review

- Real cause: the API returned `409 Conflict` because the normalized URL was already saved; the web UI treated every rejected save as a generic failure.
- The web server function now converts duplicate saves into an `alreadySaved` result instead of a 500 response.
- The capture form now shows `Ce Bookmark est déjà sauvegardé.` for duplicates and keeps destructive styling only for real failures.
- Validation passed: targeted duplicate Playwright repro against `http://localhost:5174`, `corepack pnpm --filter @stashbox/web test`, `typecheck`, `build`, `test:e2e`, and targeted ESLint.

---

# Unified Search Field

## Plan

- [x] Keep one primary search field for title, URL, and semantic search.
- [x] Preserve type and tag filters as refinements.
- [x] Merge local title/URL matches with semantic results without duplicates.
- [x] Use one URL query param for the unified search.
- [x] Update unit/e2e tests and verify in browser.

## Scope

- App: `apps/web`.
- User-facing copy stays French.
- Existing design direction stays industrial / control-room.

## Review

- Replaced the separate semantic and text fields with one unified search field.
- Typing filters visible Bookmarks by title/URL immediately; submitting runs semantic search and merges those results without duplicates.
- Type and tag filters remain as refinements and preserve `q` in the URL when cleared.
- Validation passed: `corepack pnpm --filter @stashbox/web test`, `typecheck`, `build`, `test:e2e`, targeted ESLint, and Playwright interaction check against `http://localhost:5174`.

---

# Bug - UI Interactions Blocked

## Plan

- [x] Reproduce the blocked inputs/buttons in `apps/web`.
- [x] Capture the exact failing interaction signal with Playwright/browser console.
- [x] Rank falsifiable hypotheses before changing code.
- [x] Fix the smallest root cause for pointer/keyboard interaction.
- [x] Add or update regression coverage at the correct UI seam if available.
- [x] Re-run the original repro plus typecheck/test/build where relevant.

## Scope

- App: `apps/web`.
- Symptom: page renders, but fields cannot be typed into and controls cannot be clicked.
- User-facing copy stays French.

## Review

- Reproduced the bug in Playwright: controls detached repeatedly while the console logged `serverOnly() functions can only be called on the server!`.
- Correct hypothesis: the route loader called a server-only helper directly; TanStack Start loaders can run client-side during navigation/hydration.
- Wrapped initial browse loading in `createServerFn`, kept the server-side API implementation testable, and added an e2e regression that types into fields and clicks a control after hydration.
- Validation passed: original Playwright repro against `http://localhost:5175`, `corepack pnpm --filter @stashbox/web typecheck`, `corepack pnpm --filter @stashbox/web test`, `corepack pnpm --filter @stashbox/web build`, `corepack pnpm --filter @stashbox/web test:e2e`, and targeted ESLint.

---

# UI Refresh - Archive Control Room

## Plan

- [x] Confirm `apps/web` structure and current browse flow.
- [x] Inventory reusable UI components and route state.
- [x] Define local design tokens in CSS.
- [x] Restyle browse page around semantic command search.
- [x] Restyle bookmark cards, add slot, loading, empty states.
- [x] Verify responsive behavior, typecheck, lint, and build.

## Scope

- App: `apps/web`.
- Stack: React/TanStack Start, Tailwind v4.
- Keep existing logic and data flow.
- User-facing copy stays French.
- Visual direction: industrial / utilitarian + Swiss typographic, “archive control room”.
- No heavy dependencies unless already present.

## Review

- Built an industrial / Swiss “archive control room” UI for `apps/web`.
- Added control-room CSS tokens, IBM Plex font stack, grid/grain surfaces, and stricter focus/selection styling.
- Reworked browse header, semantic command search, dense filter panel, bookmark grid, cards, capture slot, loading, empty, and delete dialog states.
- Kept existing data flow, URL sync, search, save, delete, pagination, and accessible labels.
- Validation passed: `corepack pnpm --filter @stashbox/web typecheck`, `corepack pnpm --filter @stashbox/web test`, `corepack pnpm --filter @stashbox/web build`, targeted ESLint on touched files.
- Full `corepack pnpm --filter @stashbox/web lint` remains blocked by existing generated `app.config.timestamp_*.js` import-sort errors plus unrelated import-sort issues outside this change.
- Visual preview checked from the production build at `http://localhost:5175`; browser console clean.

---

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
- [x] Push branch and create draft PR linked with `Closes #40`.

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
