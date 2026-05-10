import type { Bookmark } from "@stashbox/shared";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";
import type { AddBookmarkResult, InitialBrowseData } from "~/server/stashbox.ts";
import {
  addBookmark,
  deleteBookmark,
  listBookmarks,
  loadInitialBrowseData,
  searchBookmarks,
} from "~/server/stashbox.ts";

export const Route = createFileRoute("/")({
  loader: () => loadInitialBrowseData(),
  errorComponent: HomeErrorPage,
  component: HomePage,
});

function HomePage() {
  const { bookmarkPageSize, bookmarks, hasMoreBookmarks } =
    Route.useLoaderData() as InitialBrowseData;
  const saveBookmark = useSaveBookmark();
  const removeBookmark = useDeleteBookmark();
  const loadMoreBookmarks = useLoadMoreBookmarks();
  const semanticSearchBookmarks = useSearchBookmarks();

  return (
    <BookmarkBrowsePage
      bookmarkPageSize={bookmarkPageSize}
      bookmarks={bookmarks}
      hasMoreBookmarks={hasMoreBookmarks}
      onSaveBookmark={saveBookmark}
      onDeleteBookmark={removeBookmark}
      onLoadMoreBookmarks={loadMoreBookmarks}
      onSearchBookmarks={semanticSearchBookmarks}
    />
  );
}

function HomeErrorPage() {
  const saveBookmark = useSaveBookmark();
  const removeBookmark = useDeleteBookmark();
  const semanticSearchBookmarks = useSearchBookmarks();

  return (
    <BookmarkBrowsePage
      bookmarks={[]}
      loadError="Impossible de charger les Bookmarks."
      onSaveBookmark={saveBookmark}
      onDeleteBookmark={removeBookmark}
      onSearchBookmarks={semanticSearchBookmarks}
    />
  );
}

function useSaveBookmark() {
  const router = useRouter();

  return async (url: string) => {
    const result = (await addBookmark({ data: { url } })) as AddBookmarkResult;
    await router.invalidate();
    return result;
  };
}

function useDeleteBookmark() {
  return async (id: string) => {
    await deleteBookmark({ data: { id } });
  };
}

function useLoadMoreBookmarks() {
  return async (params: { limit: number; offset: number }) => {
    return ((await listBookmarks({ data: params })) as Bookmark[] | undefined) ?? [];
  };
}

function useSearchBookmarks() {
  return async (query: string) => {
    return (
      ((await searchBookmarks({ data: { query, limit: 48 } })) as Bookmark[] | undefined) ?? []
    );
  };
}
