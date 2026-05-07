import type { Bookmark } from "@stashbox/shared";

import { BookmarkCard } from "./bookmark-card.tsx";

type BookmarkGridProps = {
  bookmarks: Bookmark[];
};

export function BookmarkGrid({ bookmarks }: BookmarkGridProps) {
  return (
    <div
      role="list"
      aria-label="Bookmarks"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id} role="listitem">
          <BookmarkCard bookmark={bookmark} />
        </div>
      ))}
    </div>
  );
}
