import type { Bookmark } from "@stashbox/shared";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";
import { addBookmark, loadInitialBookmarks } from "~/server/stashbox.ts";

export const Route = createFileRoute("/")({
  loader: () => loadInitialBookmarks(),
  errorComponent: HomeErrorPage,
  component: HomePage,
});

function HomePage() {
  const bookmarks = Route.useLoaderData() as Bookmark[];
  const saveBookmark = useSaveBookmark();

  return <BookmarkBrowsePage bookmarks={bookmarks} onSaveBookmark={saveBookmark} />;
}

function HomeErrorPage() {
  const saveBookmark = useSaveBookmark();

  return (
    <BookmarkBrowsePage
      bookmarks={[]}
      loadError="Impossible de charger les Bookmarks."
      onSaveBookmark={saveBookmark}
    />
  );
}

function useSaveBookmark() {
  const router = useRouter();

  return async (url: string) => {
    await addBookmark({ data: { url } });
    await router.invalidate();
  };
}
