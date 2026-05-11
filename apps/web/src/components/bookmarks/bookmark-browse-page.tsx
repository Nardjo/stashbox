import type { Bookmark, SiteCredentialMetadata } from "@stashbox/shared";
import { ChevronDown, KeyRound, SlidersHorizontal, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "~/components/theme/theme.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select.tsx";

import type { SaveBookmarkResult } from "./add-bookmark-card.tsx";
import { BookmarkGrid } from "./bookmark-grid.tsx";

const bookmarkTypes = ["tweet", "youtube", "article", "image", "pdf", "other"] as const;
const searchParamName = "q";
const legacySemanticSearchParamName = "semantic";
const allBookmarkTypesValue = "all";
const emptySiteCredentials: SiteCredentialMetadata[] = [];
const filterControlClassName =
  "w-full rounded-sm border border-input bg-card/80 px-3 py-2 font-mono text-sm text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

type BookmarkBrowsePageProps = {
  bookmarkPageSize?: number;
  bookmarks: Bookmark[];
  hasMoreBookmarks?: boolean;
  siteCredentials?: SiteCredentialMetadata[];
  loadError?: string;
  onSaveBookmark: (url: string) => Promise<SaveBookmarkResult | void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onDeleteSiteCredential?: (id: string) => Promise<void>;
  onLoadMoreBookmarks?: (params: BookmarkPageParams) => Promise<Bookmark[]>;
  onSearchBookmarks?: (query: string) => Promise<Bookmark[]>;
};

export function BookmarkBrowsePage({
  bookmarkPageSize = 48,
  bookmarks,
  hasMoreBookmarks = false,
  siteCredentials = emptySiteCredentials,
  loadError,
  onSaveBookmark,
  onDeleteBookmark,
  onDeleteSiteCredential,
  onLoadMoreBookmarks,
  onSearchBookmarks,
}: BookmarkBrowsePageProps) {
  const [visibleBookmarks, setVisibleBookmarks] = useState(bookmarks);
  const [visibleSiteCredentials, setVisibleSiteCredentials] = useState(siteCredentials);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookmarkFilters>(getInitialBookmarkFilters);
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [semanticResults, setSemanticResults] = useState<Bookmark[] | null>(null);
  const [isSearchingBookmarks, setIsSearchingBookmarks] = useState(false);
  const [hasLoadedUrlFilters, setHasLoadedUrlFilters] = useState(false);
  const [hasRestoredUrlSearch, setHasRestoredUrlSearch] = useState(false);
  const [canLoadMoreBookmarks, setCanLoadMoreBookmarks] = useState(hasMoreBookmarks);
  const [isLoadingMoreBookmarks, setIsLoadingMoreBookmarks] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const selectedTypeLabel = filters.typeFilter || "Tous les types";

  useEffect(() => {
    setVisibleBookmarks(bookmarks);
    setCanLoadMoreBookmarks(hasMoreBookmarks);
  }, [bookmarks, filters, hasMoreBookmarks, searchQuery]);

  useEffect(() => {
    setVisibleSiteCredentials(siteCredentials);
  }, [siteCredentials]);

  useEffect(() => {
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

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      if (isEditableKeyboardTarget(event.target)) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  async function handleDeleteBookmark(id: string) {
    let removedBookmark: Bookmark | undefined;
    let removedIndex = -1;

    setVisibleBookmarks((current) => {
      removedIndex = current.findIndex((bookmark) => bookmark.id === id);
      removedBookmark = removedIndex >= 0 ? current[removedIndex] : undefined;
      return current.filter((bookmark) => bookmark.id !== id);
    });
    setSemanticResults((current) =>
      current ? current.filter((bookmark) => bookmark.id !== id) : current,
    );

    try {
      await onDeleteBookmark(id);
    } catch {
      const bookmarkToRestore = removedBookmark;
      if (bookmarkToRestore) {
        setVisibleBookmarks((current) => {
          if (current.some((bookmark) => bookmark.id === id)) return current;

          const restoredBookmarks = [...current];
          restoredBookmarks.splice(Math.max(removedIndex, 0), 0, bookmarkToRestore);
          return restoredBookmarks;
        });
      }
    }
  }

  async function handleDeleteSiteCredential(id: string) {
    if (!onDeleteSiteCredential || deletingCredentialId) return;

    setDeletingCredentialId(id);
    try {
      await onDeleteSiteCredential(id);
      setVisibleSiteCredentials((current) => current.filter((credential) => credential.id !== id));
    } finally {
      setDeletingCredentialId(null);
    }
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
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end">
                <img
                  src="/stashbox-logo.png"
                  alt="Logo Stashbox"
                  className="h-20 w-20 rounded-sm border border-border bg-background object-cover sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                />
                <h1 className="font-display text-5xl font-semibold uppercase leading-[0.85] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
                  Stashbox
                </h1>
              </div>
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
          className="archive-panel archive-grid-surface relative overflow-hidden rounded-sm border-border p-3 sm:p-4"
        >
          <div className="relative grid grid-cols-[minmax(0,1fr)_3rem] gap-2 sm:grid-cols-[minmax(0,1fr)_3.5rem] lg:grid-cols-[minmax(18rem,1fr)_16rem] lg:items-center">
            <label className="block min-w-0">
              <span className="sr-only">Rechercher</span>
              <input
                ref={searchInputRef}
                id="bookmark-search-query"
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchQueryChange(event.target.value)}
                disabled={isSearchingBookmarks}
                placeholder="Rechercher par titre, URL ou sens..."
                className={`${filterControlClassName} h-12 text-base sm:h-14`}
              />
            </label>
            <Select
              value={filters.typeFilter || allBookmarkTypesValue}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  typeFilter: value === allBookmarkTypesValue ? "" : (value as Bookmark["type"]),
                }))
              }
            >
              <SelectTrigger
                aria-label="Filtrer par type"
                title="Filtrer par type"
                className="type-filter-trigger h-12 w-12 justify-center px-0 sm:h-14 sm:w-14 lg:w-full lg:justify-between lg:px-3"
              >
                <SlidersHorizontal
                  aria-hidden="true"
                  className={`h-4 w-4 lg:hidden ${
                    hasActiveFilters ? "text-primary" : "text-foreground"
                  }`}
                />
                <div className="hidden min-w-0 lg:block">
                  <SelectValue>{selectedTypeLabel}</SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-52 border-primary/40 bg-popover/95">
                <SelectItem value={allBookmarkTypesValue}>Tous les types</SelectItem>
                {bookmarkTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <section className="archive-panel overflow-hidden rounded-sm border-border">
          <button
            type="button"
            aria-expanded={isCredentialsOpen}
            onClick={() => setIsCredentialsOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 p-3 text-left sm:p-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-card/70 text-primary">
                <KeyRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="technical-label block">Identifiants site</span>
                <span className="mt-1 block truncate font-mono text-sm text-muted-foreground">
                  {visibleSiteCredentials.length === 0
                    ? "Aucun cookie synchronisé"
                    : `${visibleSiteCredentials.length} domaine${
                        visibleSiteCredentials.length > 1 ? "s" : ""
                      } synchronisé${visibleSiteCredentials.length > 1 ? "s" : ""}`}
                </span>
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 transition ${isCredentialsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isCredentialsOpen ? (
            <div className="border-t border-border p-3 sm:p-4">
              {visibleSiteCredentials.length === 0 ? (
                <p className="font-mono text-sm text-muted-foreground">
                  Synchronisez les cookies depuis l'extension pour les domaines authentifiés.
                </p>
              ) : (
                <ul aria-label="Identifiants site synchronisés" className="grid gap-2">
                  {visibleSiteCredentials.map((credential) => (
                    <li
                      key={credential.id}
                      className="grid gap-3 rounded-sm border border-border bg-card/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-foreground">
                          {credential.domain}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {credential.cookieCount} cookies ·{" "}
                          {formatBookmarkDate(credential.updatedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSiteCredential(credential.id)}
                        disabled={!onDeleteSiteCredential || deletingCredentialId === credential.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-destructive/50 px-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-destructive transition hover:border-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        {deletingCredentialId === credential.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
  typeFilter: Bookmark["type"] | "";
};

function getInitialBookmarkFilters(): BookmarkFilters {
  if (typeof window === "undefined") {
    return { typeFilter: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const typeFilter = parseBookmarkType(params.get("type"));

  return { typeFilter };
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
  params.delete("tags");

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

function filterBookmarksByFacets(bookmarks: Bookmark[], filters: BookmarkFilters) {
  return bookmarks.filter((bookmark) => {
    const matchesType = !filters.typeFilter || bookmark.type === filters.typeFilter;

    return matchesType;
  });
}

function hasActiveBookmarkFilters(filters: BookmarkFilters) {
  return Boolean(filters.typeFilter);
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

function formatBookmarkDate(value: string | null) {
  if (!value) return "Non renseigné";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}
