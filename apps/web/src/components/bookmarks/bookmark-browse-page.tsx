import type { Tag } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
import { useEffect, useState } from "react";

import { ThemeToggle } from "~/components/theme/theme.tsx";

import { BookmarkGrid } from "./bookmark-grid.tsx";

const bookmarkTypes = ["tweet", "youtube", "article", "image", "pdf", "other"] as const;
const emptyBookmarkFilters: BookmarkFilters = { selectedTags: [], textFilter: "", typeFilter: "" };
const filterControlClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-200 dark:focus:ring-slate-200/10";

type BookmarkBrowsePageProps = {
  bookmarkPageSize?: number;
  bookmarks: Bookmark[];
  hasMoreBookmarks?: boolean;
  tags?: Tag[];
  loadError?: string;
  onSaveBookmark: (url: string) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onLoadMoreBookmarks?: (params: BookmarkPageParams) => Promise<Bookmark[]>;
};

export function BookmarkBrowsePage({
  bookmarkPageSize = 48,
  bookmarks,
  hasMoreBookmarks = false,
  tags = [],
  loadError,
  onSaveBookmark,
  onDeleteBookmark,
  onLoadMoreBookmarks,
}: BookmarkBrowsePageProps) {
  const [visibleBookmarks, setVisibleBookmarks] = useState(bookmarks);
  const [filters, setFilters] = useState<BookmarkFilters>(emptyBookmarkFilters);
  const [hasLoadedUrlFilters, setHasLoadedUrlFilters] = useState(false);
  const [canLoadMoreBookmarks, setCanLoadMoreBookmarks] = useState(hasMoreBookmarks);
  const [isLoadingMoreBookmarks, setIsLoadingMoreBookmarks] = useState(false);
  const filteredBookmarks = filterBookmarks(visibleBookmarks, filters);
  const countLabel =
    filteredBookmarks.length === 1 ? "1 Bookmark" : `${filteredBookmarks.length} Bookmarks`;
  const hasActiveFilters = hasActiveBookmarkFilters(filters);

  useEffect(() => {
    setVisibleBookmarks(bookmarks);
    setCanLoadMoreBookmarks(hasMoreBookmarks);
  }, [bookmarks, filters, hasMoreBookmarks]);

  useEffect(() => {
    setFilters(getInitialBookmarkFilters());
    setHasLoadedUrlFilters(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedUrlFilters) return;

    syncBookmarkFiltersToUrl(filters);
  }, [filters, hasLoadedUrlFilters]);

  async function handleDeleteBookmark(id: string) {
    await onDeleteBookmark(id);
    setVisibleBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
  }

  async function handleLoadMoreBookmarks() {
    if (!onLoadMoreBookmarks || isLoadingMoreBookmarks) return;

    setIsLoadingMoreBookmarks(true);
    try {
      const nextBookmarks = await onLoadMoreBookmarks({
        limit: bookmarkPageSize,
        offset: visibleBookmarks.length,
      });
      setVisibleBookmarks((current) => [...current, ...nextBookmarks]);
      setCanLoadMoreBookmarks(nextBookmarks.length === bookmarkPageSize);
    } finally {
      setIsLoadingMoreBookmarks(false);
    }
  }

  function toggleTag(tag: string) {
    setFilters((current) => {
      if (current.selectedTags.includes(tag)) {
        return {
          ...current,
          selectedTags: current.selectedTags.filter((selectedTag) => selectedTag !== tag),
        };
      }

      return { ...current, selectedTags: [...current.selectedTags, tag] };
    });
  }

  function clearFilters() {
    setFilters(emptyBookmarkFilters);
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
        <section
          aria-label="Filtres de Bookmarks"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Filtrer par texte</span>
              <input
                type="search"
                value={filters.textFilter}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, textFilter: event.target.value }))
                }
                placeholder="Titre ou URL"
                className={filterControlClassName}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Filtrer par type</span>
              <select
                value={filters.typeFilter}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    typeFilter: event.target.value as Bookmark["type"] | "",
                  }))
                }
                className={filterControlClassName}
              >
                <option value="">Tous les types</option>
                {bookmarkTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {tags.length > 0 ? (
            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Filtrer par tags
              </legend>
              <div className="flex flex-wrap gap-2">
                {tags.map(({ tag, count }) => (
                  <label
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={filters.selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950"
                    />
                    <span>
                      {tag} ({count})
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Effacer les filtres
            </button>
          ) : null}
        </section>
        <BookmarkGrid
          bookmarks={filteredBookmarks}
          onSaveBookmark={onSaveBookmark}
          onDeleteBookmark={handleDeleteBookmark}
        />
        {onLoadMoreBookmarks && canLoadMoreBookmarks ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLoadMoreBookmarks}
              disabled={isLoadingMoreBookmarks}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
            >
              {isLoadingMoreBookmarks ? "Chargement..." : "Charger plus"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

type BookmarkPageParams = {
  limit: number;
  offset: number;
};

type BookmarkFilters = {
  selectedTags: string[];
  textFilter: string;
  typeFilter: Bookmark["type"] | "";
};

function getInitialBookmarkFilters(): BookmarkFilters {
  if (typeof window === "undefined") {
    return { selectedTags: [], textFilter: "", typeFilter: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const typeFilter = parseBookmarkType(params.get("type"));

  return {
    selectedTags: parseTagsParam(params.get("tags")),
    textFilter: params.get("q") ?? "",
    typeFilter,
  };
}

function syncBookmarkFiltersToUrl(filters: BookmarkFilters) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const textFilter = filters.textFilter.trim();
  if (textFilter) {
    params.set("q", textFilter);
  } else {
    params.delete("q");
  }

  if (filters.typeFilter) {
    params.set("type", filters.typeFilter);
  } else {
    params.delete("type");
  }

  if (filters.selectedTags.length > 0) {
    params.set("tags", filters.selectedTags.join(","));
  } else {
    params.delete("tags");
  }

  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function parseBookmarkType(value: string | null): Bookmark["type"] | "" {
  if (bookmarkTypes.some((type) => type === value)) return value as Bookmark["type"];

  return "";
}

function parseTagsParam(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function filterBookmarks(bookmarks: Bookmark[], filters: BookmarkFilters) {
  return filterBookmarksByText(bookmarks, filters.textFilter).filter((bookmark) => {
    const matchesType = !filters.typeFilter || bookmark.type === filters.typeFilter;
    const matchesTags =
      filters.selectedTags.length === 0 ||
      filters.selectedTags.some((tag) => bookmark.tags.includes(tag));

    return matchesType && matchesTags;
  });
}

function hasActiveBookmarkFilters(filters: BookmarkFilters) {
  return Boolean(filters.textFilter || filters.typeFilter || filters.selectedTags.length > 0);
}

function filterBookmarksByText(bookmarks: Bookmark[], textFilter: string) {
  const query = textFilter.trim().toLocaleLowerCase();
  if (!query) return bookmarks;

  return bookmarks.filter((bookmark) => {
    return (
      bookmark.title.toLocaleLowerCase().includes(query) ||
      bookmark.url.toLocaleLowerCase().includes(query)
    );
  });
}
