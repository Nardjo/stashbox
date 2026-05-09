import { createFileRoute, useRouter } from "@tanstack/react-router";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";
import type { InitialBrowseData } from "~/server/stashbox.ts";
import { addBookmark, deleteBookmark, loadInitialBrowseData } from "~/server/stashbox.ts";

export const Route = createFileRoute("/")({
  loader: () => loadInitialBrowseData(),
  errorComponent: HomeErrorPage,
  component: HomePage,
});

function HomePage() {
  const { bookmarks, tags } = Route.useLoaderData() as InitialBrowseData;
  const saveBookmark = useSaveBookmark();
  const removeBookmark = useDeleteBookmark();

  return (
    <BookmarkBrowsePage
      bookmarks={bookmarks}
      tags={tags}
      onSaveBookmark={saveBookmark}
      onDeleteBookmark={removeBookmark}
    />
  );
}

function HomeErrorPage() {
  const saveBookmark = useSaveBookmark();
  const removeBookmark = useDeleteBookmark();

  return (
    <BookmarkBrowsePage
      bookmarks={[]}
      tags={[]}
      loadError="Impossible de charger les Bookmarks."
      onSaveBookmark={saveBookmark}
      onDeleteBookmark={removeBookmark}
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

function useDeleteBookmark() {
  return async (id: string) => {
    await deleteBookmark({ data: { id } });
  };
}
