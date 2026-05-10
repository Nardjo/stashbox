import type { Bookmark } from "@stashbox/shared";

import { AddBookmarkCard, type SaveBookmarkResult } from "./add-bookmark-card.tsx";
import { BookmarkCard } from "./bookmark-card.tsx";

type BookmarkGridProps = {
  bookmarks: Bookmark[];
  onSaveBookmark: (url: string) => Promise<SaveBookmarkResult | void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  showAddBookmarkCard?: boolean;
};

export function BookmarkGrid({
  bookmarks,
  onSaveBookmark,
  onDeleteBookmark,
  showAddBookmarkCard = true,
}: BookmarkGridProps) {
  return (
    <div
      role="list"
      aria-label="Bookmarks"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      {showAddBookmarkCard ? (
        <div role="listitem">
          <AddBookmarkCard onSaveBookmark={onSaveBookmark} />
        </div>
      ) : null}
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id} role="listitem">
          <BookmarkCard bookmark={bookmark} onDeleteBookmark={onDeleteBookmark} />
        </div>
      ))}
    </div>
  );
}
