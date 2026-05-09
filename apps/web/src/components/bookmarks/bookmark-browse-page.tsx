import type { Bookmark } from "@stashbox/shared";

import { BookmarkGrid } from "./bookmark-grid.tsx";

type BookmarkBrowsePageProps = {
  bookmarks: Bookmark[];
  loadError?: string;
  onSaveBookmark: (url: string) => Promise<void>;
};

export function BookmarkBrowsePage({
  bookmarks,
  loadError,
  onSaveBookmark,
}: BookmarkBrowsePageProps) {
  const countLabel = bookmarks.length === 1 ? "1 Bookmark" : `${bookmarks.length} Bookmarks`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Bookmarks</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Stashbox</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Parcourez votre corpus sauvegardé avec son contexte d'enrichissement.
              </p>
            </div>
            <p className="text-sm text-slate-500">{countLabel}</p>
          </div>
          {loadError ? (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {loadError}
            </p>
          ) : null}
        </header>
        <BookmarkGrid bookmarks={bookmarks} onSaveBookmark={onSaveBookmark} />
      </div>
    </main>
  );
}
