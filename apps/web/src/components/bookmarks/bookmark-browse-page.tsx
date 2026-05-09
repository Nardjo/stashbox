import type { Bookmark } from "@stashbox/shared";
import { useEffect, useState } from "react";

import { ThemeToggle } from "~/components/theme/theme.tsx";

import { BookmarkGrid } from "./bookmark-grid.tsx";

type BookmarkBrowsePageProps = {
  bookmarks: Bookmark[];
  loadError?: string;
  onSaveBookmark: (url: string) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
};

export function BookmarkBrowsePage({
  bookmarks,
  loadError,
  onSaveBookmark,
  onDeleteBookmark,
}: BookmarkBrowsePageProps) {
  const [visibleBookmarks, setVisibleBookmarks] = useState(bookmarks);
  const countLabel =
    visibleBookmarks.length === 1 ? "1 Bookmark" : `${visibleBookmarks.length} Bookmarks`;

  useEffect(() => {
    setVisibleBookmarks(bookmarks);
  }, [bookmarks]);

  async function handleDeleteBookmark(id: string) {
    await onDeleteBookmark(id);
    setVisibleBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Bookmarks
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Stashbox</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Parcourez votre corpus sauvegardé avec son contexte d'enrichissement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">{countLabel}</p>
              <ThemeToggle />
            </div>
          </div>
          {loadError ? (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
            >
              {loadError}
            </p>
          ) : null}
        </header>
        <BookmarkGrid
          bookmarks={visibleBookmarks}
          onSaveBookmark={onSaveBookmark}
          onDeleteBookmark={handleDeleteBookmark}
        />
      </div>
    </main>
  );
}
