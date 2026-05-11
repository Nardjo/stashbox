# Issue 55 - Server Capture for URL-only Saves

## Plan

- [x] Read GitHub issue #55 and create draft PR linked with `Closes #55`.
- [x] RED 1: API functional test proves URL-only bookmark save returns immediately with no capture, then async server capture fills capture metadata after queue flush.
- [x] GREEN 1: Add server capture queue/job and wire URL-only saves to dispatch without blocking response.
- [x] RED 2: worker failure leaves bookmark/enrichment healthy and capture empty.
- [x] GREEN 2: isolate capture failures and keep them non-blocking.
- [x] RED 3: dedupe/conflict does not enqueue or replace an existing capture.
- [x] GREEN 3: preserve existing dedupe behavior.
- [x] RED/GREEN: import CSV URL-only rows also enqueue Server Capture.
- [x] Refactor: keep Playwright rendering behind a small provider interface and reuse capture storage serialization.
- [x] Verify API tests, typecheck, focused lint/prettier, and a local browser smoke test.

## Review

- Server Capture now uses a dedicated BullMQ queue and local Playwright provider.
- URL-only API saves enqueue capture without blocking the 201 response; YouTube keeps thumbnail behavior.
- CSV import also dispatches capture for URL-only non-YouTube rows.
- Capture failures are isolated from enrichment state.
- Targeted lint/prettier, package typechecks, API test suite, shared/api-client tests, and Playwright smoke passed.

## Scope

- Apps/packages: `apps/api` primarily; `apps/web` only if display ordering needs adjustment.
- Public behavior: `/bookmarks` response remains fast; capture arrives asynchronously through the worker.
- Out of scope: authenticated server capture with saved cookies (#57) and Groq transcription (#59).

---

# Parallel Implementation: Issues #54, #56, #58

## Plan

- [x] Launch parallel workers for #54 Client Capture, #56 Site credentials, and #58 Media detection.
- [x] Prepare shared integration contracts for Bookmark fields and API serialization.
- [x] Integrate #54 changes and verify extension/API/Web behavior.
- [x] Integrate #56 changes and verify credential sync/API/Web behavior.
- [x] Integrate #58 changes and verify media detection/transcription lifecycle behavior.
- [x] Resolve conflicts across shared schemas, controllers, tests, and UI.
- [x] Run focused tests, typechecks, lint, and browser verification.

## Scope

- Issues: #54, #56, #58.
- Apps/packages: `apps/api`, `apps/extension`, `apps/web`, `packages/shared`, `packages/api-client`.
- Keep #55 Server Capture, #57 authenticated Server Capture, #59 Groq transcription worker, and later slices out of scope.

---

# Issue 58 Media Detection And Transcription Lifecycle

## Plan

- [ ] Add shared allowlist-based Media detection separate from Bookmark Type.
- [ ] Add Bookmark transcription status/result/error contracts.
- [ ] Persist Media and transcription fields in the API.
- [ ] Enqueue placeholder transcription work for Media Bookmarks without blocking Save or Enrichment.
- [ ] Keep transcription failures isolated from `enrichmentStatus`.
- [ ] Surface transcription status/errors in the Web App.
- [ ] Add focused shared/API/Web tests and run verification.

## Scope

- Apps/packages: `packages/shared`, `apps/api`, `apps/web`.
- Out of scope: Capture, Site credentials, actual Groq transcription worker.

## Review

- Added allowlist media detection in shared code, separate from Bookmark Type.
- API now persists media metadata and transcription lifecycle fields.
- Media saves enqueue placeholder transcription work without blocking Save or changing enrichment status.
- Web cards/details surface transcription status/errors.
- Verified with shared tests, API suite, Web tests, and targeted typechecks.

---

# Site Credentials Sync

## Plan

- [ ] Add encrypted Site credentials persistence keyed by normalized domain.
- [ ] Add authenticated sync/list/read/delete API returning metadata only.
- [ ] Add API client/shared types for Site credentials metadata and sync payloads.
- [ ] Add explicit extension action to sync current-site cookies without coupling to Bookmark save.
- [ ] Add Web App management UI to list and delete stored Site credentials.
- [ ] Add focused API, client, extension, and Web App tests.
- [ ] Verify targeted tests, typecheck/lint where feasible, and `git diff --check`.

## Scope

- Apps: `apps/api`, `apps/extension`, `apps/web`.
- Shared/client packages only for cross-app request/response types.
- Out of scope: Capture storage integration and media detection/transcription use.

## Review

- Added encrypted Site credentials storage keyed by normalized domain.
- Added authenticated sync/list/read/delete API and API client methods returning metadata only.
- Extension now has an explicit current-site cookie sync action, separate from Bookmark Save.
- Web App now has a collapsible Identifiants site section for list/delete.
- Verified with API, API client, extension, Web tests, and targeted typechecks.

---

# Extension Web Design Alignment

## Plan

- [x] Mirror the web app's control-room visual system in the extension stylesheet.
- [x] Refresh the popup header, states, controls, and footer without changing save behavior.
- [x] Refresh the options page panels for settings, import, and export.
- [x] Simplify popup chrome by removing the redundant header label and duplicate result logo.
- [x] Rebuild, test, typecheck, lint, and visually inspect popup/options.

## Scope

- App: `apps/extension`.
- Keep bookmark save, polling, settings, import, and export behavior unchanged.

## Review

- Popup and options now use the web app's light industrial control-room style: IBM Plex typography, grid surface, square panels, technical labels, accent controls, and the new logo.
- Popup header now shows only the Stashbox mark and title; the result card no longer repeats the logo.
- Popup success and settings states were visually verified with a mocked extension runtime.
- Options page was visually verified from the built extension output.
- Validation passed: extension build, tests, typecheck, lint, and `git diff --check`.

---

# Issue 54 - Extension Client Capture

## Plan

- [ ] Add nullable Capture metadata to the shared Bookmark contract and API create payload.
- [ ] Persist one normalized local Capture image only when `/bookmarks` creates a new Bookmark.
- [ ] Keep dedupe/conflict saves from replacing an existing Capture.
- [ ] Capture the visible viewport in the extension save flow and send it with the save request.
- [ ] Prefer Capture over `ogImage` in Web App card and detail previews.
- [ ] Add focused shared/client/API/extension/web tests.
- [ ] Run targeted verification and record results.

## Scope

- Apps/packages: `apps/extension`, `apps/api`, `apps/web`, `packages/shared`, `packages/api-client`.
- Excluded: Site credentials, Media detection/transcription, Server Capture, full-page/multi-variant capture.

## Review

- Extension Save captures the visible viewport as a PNG and sends it with the Bookmark create request.
- API stores one local Capture for new Bookmarks, exposes metadata, and serves the image under `/captures/:file`.
- Dedupe conflict responses keep the original Capture and do not overwrite it.
- Web cards/details prefer Capture over OpenGraph images.
- Verified with shared/API/API-client/extension/Web tests and targeted typechecks.

---

# Extension Branding Rename

## Plan

- [x] Replace the extension manifest name and description with Stashbox branding.
- [x] Replace popup and options document titles with Stashbox branding.
- [x] Rebuild and verify the generated extension manifest.
- [x] Run extension checks.

## Scope

- App: `apps/extension`.

## Review

- Extension install name, popup title, and options title now use Stashbox.
- Generated extension manifest is verified after rebuild.

---

# Search Button Removal

## Plan

- [x] Remove the visible search submit button from the browse search block.
- [x] Keep the search form so pressing Enter can still submit semantic search.
- [x] Keep the type dropdown to the right of the input.
- [x] Update focused tests and verify browser rendering.

## Scope

- App: `apps/web`.
- Component: bookmark browse search block.

## Review

- Search controls are now `input | filter`.
- The visible `Chercher` action is gone because typing already updates the visible results.
- Enter still routes through the existing form submit handler.

---

# Type Filter Dropdown

## Plan

- [x] Replace the native type select with the app dropdown component.
- [x] Keep the compact icon trigger at reduced widths.
- [x] Keep the full `Tous les types` trigger on desktop.
- [x] Preserve URL sync and filtering behavior.
- [x] Verify tests, lint, typecheck, and dropdown rendering.

## Scope

- App: `apps/web`.
- Component: bookmark browse search block.

## Review

- Replaced the native browser select with the Radix select already used by the UI kit.
- The dropdown menu now uses the app surface, border, check indicator, and monospaced styling.
- Compact responsive layout now stays `input | filter icon`.
- Added Vite React dedupe so Radix does not trip an invalid-hook-call during browser runs.
- Validation passed: targeted web tests, targeted ESLint, typecheck, `git diff --check`, and browser rendering on `http://localhost:5174`.
- `test:e2e` no longer reports the Radix hook error, but the suite is blocked by the test API at `localhost:3337` being down.

---

# Compact Search Actions

## Plan

- [x] Keep search controls on one row at reduced widths.
- [x] Turn the search submit action into an icon-sized button before desktop.
- [x] Turn the type filter into an icon-sized select before desktop.
- [x] Preserve full text controls on desktop.
- [x] Verify tests, lint, typecheck, and responsive rendering.

## Scope

- App: `apps/web`.
- Component: bookmark browse search block.

## Review

- Reduced-width layout is now `search input | filter icon`.
- Desktop layout keeps `search input | Tous les types`.
- The type select stays functional and accessible while visually compact.

---

# Bookmark Modal Delete

## Plan

- [x] Add a delete action inside the bookmark detail modal.
- [x] Reuse the existing delete confirmation flow.
- [x] Ensure the detail modal closes before the confirmation opens.
- [x] Cover the modal delete path with tests.
- [x] Verify lint, typecheck, and browser behavior.

## Scope

- App: `apps/web`.
- Component: bookmark detail modal.

## Review

- Added a `Supprimer` destructive action in the detail modal footer.
- The modal action opens the existing confirmation dialog instead of deleting directly.
- The card hover delete and modal delete now share the same confirmation path.

---

# Bookmark Detail Header Media

## Plan

- [x] Move the detail modal preview from the left column to the top.
- [x] Style the preview as a compact header band.
- [x] Keep the modal overflow constraints from the previous pass.
- [x] Verify tests, lint, typecheck, and browser rendering.

## Scope

- App: `apps/web`.
- Component: bookmark detail modal.

## Review

- Replaced the two-column detail modal with a top media header and content below.
- Kept the preview cropped in a fixed-height header band.
- Preserved hidden vertical scrollbar and blocked horizontal overflow.

---

# Bookmark Detail Modal Scroll

## Plan

- [x] Prevent horizontal overflow inside the detail modal.
- [x] Keep vertical scrolling functional.
- [x] Hide the visible vertical scrollbar.
- [x] Verify tests, lint, typecheck, and browser behavior.

## Scope

- App: `apps/web`.
- Components/styles: bookmark detail modal only.

## Review

- Added a reusable `scrollbar-none` utility.
- Applied `overflow-x-hidden` and `min-w-0` constraints to the detail modal layout.
- Kept the modal vertically scrollable while hiding the scrollbar.

---

# Logo Background Color

## Plan

- [x] Inspect logo alpha/background pixels.
- [x] Composite logo assets on `#17130D`.
- [x] Regenerate web favicon/app icons and extension icons.
- [x] Verify rendered logo in browser.

## Scope

- Apps: `apps/web`, `apps/extension`.
- Target background color: `#17130D`.

## Review

- The visible bands came from transparent logo pixels rendered over a darker background.
- Rebuilt logo assets with an opaque `#17130D` background.
- Updated web logo/favicons/app icons and extension icon sizes.

---

# Bookmark Detail Modal

## Plan

- [x] Remove card descriptions from the grid surface.
- [x] Make each card open a detail modal from the full card area.
- [x] Keep open/copy/delete actions separate from the card modal.
- [x] Show the hidden description and bookmark metadata in the modal.
- [x] Verify tests, lint, and browser rendering.

## Scope

- App: `apps/web`.
- Component: bookmark cards only.
- User-facing copy stays French.

## Review

- Card grid now shows image/fallback, domain, status/type, title, and tags only.
- Added a full-card click target that opens a detail modal.
- Detail modal shows description, URL, type/status, tags, dates, source, image URL, embed metadata, errors, and indexed text when available.
- Existing action rail stays independent for open/copy/delete.

---

# Bookmark Thumbnail Crop

## Plan

- [x] Identify whether the top gap is card padding or thumbnail content.
- [x] Crop the thumbnail symmetrically inside the existing image mask.
- [x] Keep hover actions and card layout unchanged.
- [x] Verify with tests and browser rendering.

## Scope

- App: `apps/web`.
- Component: bookmark cards only.

## Review

- The visible gaps came from the thumbnail image content, not card padding.
- Added a centered zoom crop on Open Graph images so previews sit against both top and bottom card edges visually.
- Kept the card wrapper, action rail, and text content untouched.

---

# Search Shortcut

## Plan

- [x] Add a keyboard shortcut to focus the unified search field.
- [x] Support `Cmd+K` on macOS and `Ctrl+K` elsewhere.
- [x] Avoid stealing the shortcut while the user is already typing in another editable field.
- [x] Cover the behavior with focused component tests.
- [x] Verify the shortcut in the browser.

## Scope

- App: `apps/web`.
- User-facing copy stays French.
- Existing search behavior and URL sync stay unchanged.

## Review

- Added a global `Cmd+K`/`Ctrl+K` handler that focuses the unified search input.
- Kept editable-field guard so typing in another input/select is not interrupted.
- Validation passed: browse-page tests, web typecheck, targeted ESLint, web e2e, headless Playwright probe, and in-app browser probe on `localhost:5174`.

---

# Compact Search Controls

## Plan

- [x] Remove visible helper text and tag selection from the search block.
- [x] Keep only the search field, submit button, and type select.
- [x] Remove tag filter state from URL sync to avoid hidden active filters.
- [x] Update tests for the simplified filter model.
- [x] Verify responsive rendering in browser.

## Scope

- App: `apps/web`.
- User-facing copy stays French.
- Keep search by text/semantic and type filtering.

## Review

- Reduced the search block to one search input, one `Chercher` button, and one type select.
- Removed tag chip selection from the control area.
- Removed tag filter state from URL sync and delete legacy `tags` params automatically.
- Kept title/URL local search and semantic search submit behavior.
- Validation passed: browse-page tests, web typecheck, targeted ESLint, web e2e, and Playwright layout probes at 390px and 1440px with no tag controls and no horizontal overflow.

---

# Stashbox Logo Assets

## Plan

- [x] Generate web favicon/site logo assets from the provided PNG.
- [x] Replace extension icon sizes from the same source.
- [x] Wire favicon links in the web root document.
- [x] Add the logo visibly to the site header.
- [x] Verify build/tests and browser rendering.

## Scope

- Apps: `apps/web`, `apps/extension`.
- Source logo: `/Users/jordanbastin/Documents/stashbox.png`.
- Keep existing industrial UI direction.

## Review

- Generated web assets: `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `stashbox-logo.png`, and `site.webmanifest`.
- Replaced extension icons at 16px, 48px, and 128px from the same logo source.
- Added favicon/apple-touch/manifest links in the root document.
- Added the logo to the site header beside `Stashbox`.
- Validation passed: web browse-page tests, web typecheck, extension tests, web build, extension build, targeted ESLint/Prettier, web e2e, HTTP asset checks, and browser screenshot on `localhost:5174`.

---

# Bookmark Card Actions

## Plan

- [x] Move card actions into a hover/focus rail.
- [x] Add an open-link action for the original URL.
- [x] Add a copy-URL action as the extra lightweight action.
- [x] Keep delete confirmation behavior intact.
- [x] Verify tests, accessibility labels, and browser rendering.

## Scope

- App: `apps/web`.
- User-facing copy stays French.
- Action rail must remain usable on keyboard focus and mobile.

## Review

- Added a compact card action rail with `open`, `copy URL`, and `delete` actions.
- Desktop hides the rail until hover/focus; mobile keeps actions available without relying on hover.
- `Copy URL` uses Clipboard API with a DOM fallback and confirms with `URL copiée`.
- Delete still opens the existing confirmation dialog.
- Validation passed: bookmark card tests, web typecheck, targeted ESLint, Playwright hover/copy/mobile probes, and web e2e.

---

# Search Filter Block

## Plan

- [x] Merge the separate search and quick-filter panels into one block.
- [x] Place the type select to the right of the search button on desktop.
- [x] Keep tags visible below the search row as compact filter chips.
- [x] Preserve existing search/filter behavior and URL state.
- [x] Verify responsive layout, tests, and browser rendering.

## Scope

- App: `apps/web`.
- User-facing copy stays French.
- Existing industrial control-room visual direction stays.

## Review

- Merged the search input, submit button, type select, and tag filters into one control-room block.
- Desktop layout is `input → chercher → type select`, with all tags directly below.
- Mobile stacks the same controls without horizontal overflow.
- Validation passed: web browse-page tests, web typecheck, targeted ESLint, web e2e, in-app browser screenshot, and Playwright layout probes at 390px and 1440px.

---

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
