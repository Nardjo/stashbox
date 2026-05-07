import type { Bookmark } from "@stashbox/shared";
import { createFileRoute } from "@tanstack/react-router";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";
import { loadInitialBookmarks } from "~/server/stashbox.ts";

export const Route = createFileRoute("/")({
  loader: () => loadInitialBookmarks(),
  errorComponent: () => (
    <BookmarkBrowsePage bookmarks={[]} loadError="Impossible de charger les Bookmarks." />
  ),
  component: HomePage,
});

function HomePage() {
  const bookmarks = Route.useLoaderData() as Bookmark[];

  return <BookmarkBrowsePage bookmarks={bookmarks} />;
}
