# Lessons

- When exposing `pending` Bookmarks in the UI, verify the full enrichment path: API insert, Redis job, running worker, provider config, and final status transition. A visible `pending` state can reveal a missing worker, not a UI bug.
- For custom-styled native selects, hide the browser arrow with `appearance-none`, reserve right padding, and place an explicit chevron inside the control instead of relying on the native arrow position.
- When thumbnails contain their own letterbox bands, crop symmetrically inside the image mask; one-sided translation can fix the top while exposing the bottom.
- For clickable cards with nested actions, use a full-card overlay button below the action rail instead of putting click handlers on the article.
- When a logo shows black bands on a dark UI, inspect alpha first; transparent pixels may need compositing onto the intended UI background color.
- For dense modal layouts, combine `overflow-x-hidden` with `min-w-0` on grid columns; hiding the scrollbar alone does not prevent horizontal overflow.
- When a detail modal feels cramped, prefer a top media header over a persistent side preview so metadata keeps full width.
- Detail modals should expose the same destructive action path as the card surface, but still route through confirmation.
- For responsive search bars, keep the input flexible and collapse adjacent actions to icon-sized controls before stacking them vertically.
- If search results update live while typing, avoid a redundant visible submit button; keep Enter submit only when a secondary semantic/search action still exists.
- Avoid native selects for polished compact filter menus on macOS; use the app dropdown component so popup styling stays controlled.
- In shadcn/Radix triggers, parent arbitrary selectors like `[&>span]:line-clamp-1` can override `hidden` on direct child spans; wrap responsive text in a non-span element when compact controls must stay icon-only.
- When adding Radix primitives in a Vite monorepo, dedupe `react` and `react-dom` in `vite.config.ts` before trusting e2e hydration results.
