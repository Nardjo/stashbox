import type { Tag } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { ThemeToggle } from "~/components/theme/theme.tsx";

import type { SaveBookmarkResult } from "./add-bookmark-card.tsx";
import { BookmarkGrid } from "./bookmark-grid.tsx";

const bookmarkTypes = ["tweet", "youtube", "article", "image", "pdf", "other"] as const;
const searchParamName = "q";
const legacySemanticSearchParamName = "semantic";
const emptyBookmarkFilters: BookmarkFilters = { selectedTags: [], typeFilter: "" };
const filterControlClassName =
  "w-full rounded-sm border border-input bg-card/80 px-3 py-2 font-mono text-sm text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

type BookmarkBrowsePageProps = {
  bookmarkPageSize?: number;
  bookmarks: Bookmark[];
  hasMoreBookmarks?: boolean;
  tags?: Tag[];
  loadError?: string;
  onSaveBookmark: (url: string) => Promise<SaveBookmarkResult | void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onLoadMoreBookmarks?: (params: BookmarkPageParams) => Promise<Bookmark[]>;
  onSearchBookmarks?: (query: string) => Promise<Bookmark[]>;
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
  onSearchBookmarks,
}: BookmarkBrowsePageProps) {
  const [visibleBookmarks, setVisibleBookmarks] = useState(bookmarks);
  const [filters, setFilters] = useState<BookmarkFilters>(emptyBookmarkFilters);
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [semanticResults, setSemanticResults] = useState<Bookmark[] | null>(null);
  const [isSearchingBookmarks, setIsSearchingBookmarks] = useState(false);
  const [hasLoadedUrlFilters, setHasLoadedUrlFilters] = useState(false);
  const [hasRestoredUrlSearch, setHasRestoredUrlSearch] = useState(false);
  const [canLoadMoreBookmarks, setCanLoadMoreBookmarks] = useState(hasMoreBookmarks);
  const [isLoadingMoreBookmarks, setIsLoadingMoreBookmarks] = useState(false);
  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;
  const filteredBookmarks = filterBookmarksByFacets(visibleBookmarks, filters);
  const localSearchResults = hasSearchQuery
    ? filterBookmarksByText(filteredBookmarks, trimmedSearchQuery)
    : filteredBookmarks;
  const filteredSemanticResults = semanticResults
    ? filterBookmarksByFacets(semanticResults, filters)
    : [];
  const displayedBookmarks = hasSearchQuery
    ? mergeBookmarks(localSearchResults, filteredSemanticResults)
    : filteredBookmarks;
  const hasEmptySearchResults =
    hasSearchQuery && !isSearchingBookmarks && displayedBookmarks.length === 0;
  const countLabel = hasSearchQuery
    ? formatSearchResultCount(displayedBookmarks.length)
    : filteredBookmarks.length === 1
      ? "1 Bookmark"
      : `${filteredBookmarks.length} Bookmarks`;
  const hasActiveFilters = hasActiveBookmarkFilters(filters);

  useEffect(() => {
    setVisibleBookmarks(bookmarks);
    setCanLoadMoreBookmarks(hasMoreBookmarks);
  }, [bookmarks, filters, hasMoreBookmarks, searchQuery]);

  useEffect(() => {
    setFilters(getInitialBookmarkFilters());
    setHasLoadedUrlFilters(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedUrlFilters) return;

    syncBookmarkFiltersToUrl(filters);
  }, [filters, hasLoadedUrlFilters]);

  useEffect(() => {
    if (hasRestoredUrlSearch) return;

    setHasRestoredUrlSearch(true);
    const query = searchQuery.trim();
    if (!query || !onSearchBookmarks) return;

    syncSearchToUrl(query);
    setIsSearchingBookmarks(true);
    void onSearchBookmarks(query)
      .then((results) => setSemanticResults(results))
      .finally(() => setIsSearchingBookmarks(false));
  }, [hasRestoredUrlSearch, onSearchBookmarks, searchQuery]);

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

  async function handleUnifiedSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) {
      clearSearch();
      return;
    }

    syncSearchToUrl(query);
    setSearchQuery(query);
    if (!onSearchBookmarks || isSearchingBookmarks) return;

    setIsSearchingBookmarks(true);
    try {
      const results = await onSearchBookmarks(query);
      setSemanticResults(results);
    } finally {
      setIsSearchingBookmarks(false);
    }
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setSemanticResults(null);
    syncSearchToUrl(value);
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

  function clearSearch() {
    setSearchQuery("");
    setSemanticResults(null);
    syncSearchToUrl("");
  }

  return (
    <main className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <header className="archive-panel overflow-hidden rounded-sm border-border">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <p className="technical-label">Archive personnelle / Bookmarks</p>
              <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.85] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
                Stashbox
              </h1>
              <p className="mt-4 max-w-3xl font-mono text-sm leading-relaxed text-muted-foreground">
                Console dense pour voir, filtrer, rechercher par sens et nettoyer votre mur de
                fiches sauvegardées.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2">
              <div className="border-b border-r border-border p-3 sm:p-4">
                <p className="technical-label">Inventaire</p>
                <p className="mt-2 font-mono text-lg font-semibold text-foreground">{countLabel}</p>
              </div>
              <div className="border-b border-border p-3 sm:border-r sm:p-4 lg:border-r-0">
                <p className="technical-label">Mode</p>
                <p className="mt-2 font-mono text-lg font-semibold text-[var(--signal)]">
                  {hasSearchQuery ? "Recherche" : "Browse"}
                </p>
              </div>
              <div className="border-r border-border p-3 sm:p-4">
                <p className="technical-label">Filtres</p>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {hasActiveFilters ? "Actifs" : "Neutres"}
                </p>
              </div>
              <div className="p-3 sm:p-4">
                <p className="technical-label">Affichage</p>
                <div className="mt-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
          {loadError ? (
            <p
              role="alert"
              className="border-t border-amber-500/50 bg-amber-500/10 p-3 font-mono text-sm text-amber-700 dark:text-amber-200"
            >
              {loadError}
            </p>
          ) : null}
        </header>

        <form
          role="search"
          aria-label="Recherche"
          onSubmit={handleUnifiedSearch}
          className="archive-panel archive-grid-surface relative overflow-hidden rounded-sm border-border p-4 sm:p-5"
        >
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="technical-label">Poste de recherche unifiée</p>
              <label
                htmlFor="bookmark-search-query"
                className="mt-2 block font-display text-3xl font-semibold uppercase leading-none tracking-[-0.02em] sm:text-4xl"
              >
                Rechercher
              </label>
              <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Titre, URL, thème ou souvenir approximatif. Le champ combine correspondance exacte
                et proximité de sens.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[34rem]">
              <input
                id="bookmark-search-query"
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchQueryChange(event.target.value)}
                disabled={isSearchingBookmarks}
                placeholder="Ex: docs.example, architecture produit"
                className={`${filterControlClassName} h-12 text-base sm:h-14`}
              />
              <button
                type="submit"
                disabled={isSearchingBookmarks || !hasSearchQuery}
                className="h-12 rounded-sm border border-primary bg-primary px-5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14"
              >
                {isSearchingBookmarks ? "Recherche..." : "Chercher"}
              </button>
              {hasSearchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="h-12 rounded-sm border border-input bg-card/80 px-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:border-accent hover:bg-accent/10 sm:h-14"
                >
                  Effacer la recherche
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <section
          aria-label="Filtres de Bookmarks"
          className="archive-panel rounded-sm border-border p-3 sm:p-4"
        >
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="technical-label">Instrumentation</p>
              <h2 className="mt-1 font-display text-2xl font-semibold uppercase tracking-[-0.02em]">
                Filtres rapides
              </h2>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-sm border border-input bg-card/80 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] transition hover:border-accent hover:bg-accent/10"
              >
                Effacer les filtres
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[12rem]">
            <label className="block space-y-2">
              <span className="technical-label">Filtrer par type</span>
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
              <legend className="technical-label">Filtrer par tags</legend>
              <div className="flex flex-wrap gap-2">
                {tags.map(({ tag, count }) => {
                  const isSelected = filters.selectedTags.includes(tag);

                  return (
                    <label
                      key={tag}
                      className={`inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 font-mono text-xs transition ${
                        isSelected
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-card/60 text-muted-foreground hover:border-accent/70 hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTag(tag)}
                        className="h-3.5 w-3.5 rounded-sm border-input bg-background text-primary focus:ring-ring"
                      />
                      <span>
                        {tag} ({count})
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </section>

        {hasEmptySearchResults ? (
          <p className="archive-panel rounded-sm border-border p-8 text-center font-mono text-sm text-muted-foreground">
            Aucun résultat.
          </p>
        ) : (
          <BookmarkGrid
            bookmarks={displayedBookmarks}
            onSaveBookmark={onSaveBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            showAddBookmarkCard={!hasSearchQuery}
          />
        )}
        {onLoadMoreBookmarks && canLoadMoreBookmarks && !hasSearchQuery ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLoadMoreBookmarks}
              disabled={isLoadingMoreBookmarks}
              className="rounded-sm border border-primary bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
  typeFilter: Bookmark["type"] | "";
};

function getInitialBookmarkFilters(): BookmarkFilters {
  if (typeof window === "undefined") {
    return { selectedTags: [], typeFilter: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const typeFilter = parseBookmarkType(params.get("type"));

  return {
    selectedTags: parseTagsParam(params.get("tags")),
    typeFilter,
  };
}

function getInitialSearchQuery() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return params.get(searchParamName) ?? params.get(legacySemanticSearchParamName) ?? "";
}

function syncBookmarkFiltersToUrl(filters: BookmarkFilters) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
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

function syncSearchToUrl(query: string) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    params.set(searchParamName, trimmedQuery);
  } else {
    params.delete(searchParamName);
  }
  params.delete(legacySemanticSearchParamName);

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

function filterBookmarksByFacets(bookmarks: Bookmark[], filters: BookmarkFilters) {
  return bookmarks.filter((bookmark) => {
    const matchesType = !filters.typeFilter || bookmark.type === filters.typeFilter;
    const matchesTags =
      filters.selectedTags.length === 0 ||
      filters.selectedTags.some((tag) => bookmark.tags.includes(tag));

    return matchesType && matchesTags;
  });
}

function hasActiveBookmarkFilters(filters: BookmarkFilters) {
  return Boolean(filters.typeFilter || filters.selectedTags.length > 0);
}

function formatSearchResultCount(count: number) {
  return count === 1 ? "1 résultat" : `${count} résultats`;
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

function mergeBookmarks(primaryBookmarks: Bookmark[], secondaryBookmarks: Bookmark[]) {
  const seenIds = new Set<string>();
  const mergedBookmarks: Bookmark[] = [];

  for (const bookmark of [...primaryBookmarks, ...secondaryBookmarks]) {
    if (seenIds.has(bookmark.id)) continue;

    seenIds.add(bookmark.id);
    mergedBookmarks.push(bookmark);
  }

  return mergedBookmarks;
}
