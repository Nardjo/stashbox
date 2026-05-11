import type { Bookmark } from "@stashbox/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";
import { ThemeProvider } from "~/components/theme/theme.tsx";

describe("BookmarkBrowsePage", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    window.history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
  });

  it("renders loaded Bookmarks in the browse grid", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stashbox" })).toBeInTheDocument();
    expect(screen.getByText("1 Bookmark"));
    expect(screen.getByRole("list", { name: "Bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
  });

  it("pluralizes the Bookmark count", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({ id: "00000000-0000-4000-8000-000000000001" }),
          createBookmark({ id: "00000000-0000-4000-8000-000000000002" }),
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByText("2 Bookmarks")).toBeInTheDocument();
  });

  it("shows one unified search input", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("search", { name: "Recherche" })).toBeInTheDocument();
    expect(screen.getByLabelText("Rechercher")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chercher" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filtrer par type" })).toHaveClass(
      "type-filter-trigger",
      "w-12",
      "lg:w-full",
    );
    expect(screen.queryByLabelText("Filtrer par texte")).not.toBeInTheDocument();
  });

  it("focuses the unified search input with Cmd+K", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByLabelText("Rechercher")).toHaveFocus();
  });

  it("does not steal Cmd+K while typing in another editable field", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    const saveInput = screen.getByLabelText("URL du Bookmark");
    saveInput.focus();
    fireEvent.keyDown(saveInput, { key: "k", metaKey: true });

    expect(saveInput).toHaveFocus();
  });

  it("searches exact title or URL matches and merges semantic results", async () => {
    const searchBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Semantic architecture",
      }),
      createBookmark({
        id: "00000000-0000-4000-8000-000000000001",
        title: "Readable systems",
      }),
    ]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
        ]}
        onSearchBookmarks={searchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "readable" },
    });
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(window.location.search).toContain("q=readable");

    fireEvent.submit(screen.getByRole("search", { name: "Recherche" }));

    await waitFor(() => expect(searchBookmarks).toHaveBeenCalledWith("readable"));
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Semantic architecture" })).toBeInTheDocument();
    expect(screen.getByText("2 résultats")).toBeInTheDocument();
  });

  it("shows a loading state while unified semantic search is in flight", async () => {
    let finishSearch!: (bookmarks: Bookmark[]) => void;
    const searchBookmarks = vi.fn(
      () =>
        new Promise<Bookmark[]>((resolve) => {
          finishSearch = resolve;
        }),
    );

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSearchBookmarks={searchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "architecture produit" },
    });
    fireEvent.submit(screen.getByRole("search", { name: "Recherche" }));

    await waitFor(() => expect(screen.getByLabelText("Rechercher")).toBeDisabled());

    finishSearch([]);
    await waitFor(() => expect(screen.getByLabelText("Rechercher")).not.toBeDisabled());
  });

  it("shows an empty state when unified search has no local or semantic result", async () => {
    const searchBookmarks = vi.fn().mockResolvedValue([]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSearchBookmarks={searchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "architecture produit" },
    });
    fireEvent.submit(screen.getByRole("search", { name: "Recherche" }));

    expect(await screen.findByText("Aucun résultat.")).toBeInTheDocument();
    expect(screen.getByText("0 résultats")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
  });

  it("clears unified search and restores the browse grid", async () => {
    const searchBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Semantic architecture",
      }),
    ]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
        ]}
        onSearchBookmarks={searchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "architecture produit" },
    });
    fireEvent.submit(screen.getByRole("search", { name: "Recherche" }));
    expect(
      await screen.findByRole("article", { name: "Semantic architecture" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "" },
    });

    expect(
      screen.queryByRole("article", { name: "Semantic architecture" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByLabelText("Rechercher")).toHaveValue("");
    expect(screen.getByText("1 Bookmark")).toBeInTheDocument();
  });

  it("syncs unified search to the URL and restores it on load", async () => {
    const searchBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Semantic architecture",
      }),
    ]);

    const { unmount } = renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSearchBookmarks={searchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "architecture produit" },
    });
    fireEvent.submit(screen.getByRole("search", { name: "Recherche" }));

    await waitFor(() => expect(window.location.search).toContain("q=architecture+produit"));
    unmount();
    window.history.replaceState(null, "", "/?q=architecture%20produit");

    const restoredSearchBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000004",
        title: "Restored semantic result",
      }),
    ]);
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSearchBookmarks={restoredSearchBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    await waitFor(() =>
      expect(restoredSearchBookmarks).toHaveBeenCalledWith("architecture produit"),
    );
    expect(screen.getByLabelText("Rechercher")).toHaveValue("architecture produit");
    expect(screen.getByRole("article", { name: "Restored semantic result" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
  });

  it("loads the next Bookmark page and appends it to the grid", async () => {
    const loadMoreBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Pagination systems",
      }),
    ]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Vue patterns",
          }),
        ]}
        bookmarkPageSize={2}
        hasMoreBookmarks={true}
        onLoadMoreBookmarks={loadMoreBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Charger plus" }));

    await waitFor(() => expect(loadMoreBookmarks).toHaveBeenCalledWith({ limit: 2, offset: 2 }));
    expect(screen.getByRole("article", { name: "Pagination systems" })).toBeInTheDocument();
    expect(screen.getByText("3 Bookmarks")).toBeInTheDocument();
  });

  it("hides the load more trigger after a short page is loaded", async () => {
    const loadMoreBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Last Bookmark",
      }),
    ]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Vue patterns",
          }),
        ]}
        bookmarkPageSize={2}
        hasMoreBookmarks={true}
        onLoadMoreBookmarks={loadMoreBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Charger plus" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull());
    expect(screen.getByRole("article", { name: "Last Bookmark" })).toBeInTheDocument();
  });

  it("shows a loading state while the next Bookmark page is loading", async () => {
    let finishLoad!: (bookmarks: Bookmark[]) => void;
    const loadMoreBookmarks = vi.fn(
      () =>
        new Promise<Bookmark[]>((resolve) => {
          finishLoad = resolve;
        }),
    );

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Vue patterns",
          }),
        ]}
        bookmarkPageSize={2}
        hasMoreBookmarks={true}
        onLoadMoreBookmarks={loadMoreBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Charger plus" }));

    const loadingButton = await screen.findByRole("button", { name: "Chargement..." });
    expect(loadingButton).toBeDisabled();

    finishLoad([]);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Chargement..." })).not.toBeInTheDocument(),
    );
  });

  it("resets loaded pages when active filters change", async () => {
    const loadMoreBookmarks = vi.fn().mockResolvedValue([
      createBookmark({
        id: "00000000-0000-4000-8000-000000000003",
        title: "Pagination systems",
      }),
    ]);

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Vue patterns",
          }),
        ]}
        bookmarkPageSize={2}
        hasMoreBookmarks={true}
        onLoadMoreBookmarks={loadMoreBookmarks}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Charger plus" }));
    expect(await screen.findByRole("article", { name: "Pagination systems" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "pagination" },
    });

    expect(screen.queryByRole("article", { name: "Pagination systems" })).not.toBeInTheDocument();
    expect(screen.getByText("0 résultats")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Charger plus" })).not.toBeInTheDocument();
  });

  it("searches Bookmarks by title or URL text from the unified field", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
            url: "https://example.com/readable-systems",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Vue patterns",
            url: "https://docs.example.com/vue-patterns",
          }),
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "docs.example" },
    });

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Vue patterns" })).toBeInTheDocument();
    expect(screen.getByText("1 résultat")).toBeInTheDocument();
  });

  it("filters Bookmarks by selected type", async () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
            type: "article",
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Nuxt walkthrough",
            type: "youtube",
          }),
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    await selectBookmarkType("youtube");

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt walkthrough" })).toBeInTheDocument();
    expect(screen.getByText("1 Bookmark")).toBeInTheDocument();
  });

  it("does not render tag selection controls in the search block", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ tags: ["architecture"] })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.queryByText("Tous les tags")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("architecture (1)")).not.toBeInTheDocument();
  });

  it("syncs active type filters to the URL", async () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
            type: "article",
            tags: ["architecture"],
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Nuxt architecture",
            type: "youtube",
            tags: ["architecture"],
          }),
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Rechercher"), {
      target: { value: "nuxt" },
    });
    await selectBookmarkType("youtube");

    const activeParams = new URLSearchParams(window.location.search);
    expect(activeParams.get("q")).toBe("nuxt");
    expect(activeParams.get("type")).toBe("youtube");
    expect(activeParams.get("tags")).toBeNull();
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt architecture" })).toBeInTheDocument();
    expect(screen.getByText("1 résultat")).toBeInTheDocument();
  });

  it("initializes the type filter from the URL query string and drops legacy tag filters", async () => {
    window.history.replaceState(null, "", "/?q=nuxt&type=youtube&tags=architecture");

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({
            id: "00000000-0000-4000-8000-000000000001",
            title: "Readable systems",
            type: "article",
            tags: ["architecture"],
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000002",
            title: "Nuxt architecture",
            type: "youtube",
            tags: ["architecture"],
          }),
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByLabelText("Rechercher")).toHaveValue("nuxt");
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Filtrer par type" })).toHaveTextContent(
        "youtube",
      ),
    );
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("tags")).toBeNull());
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt architecture" })).toBeInTheDocument();
  });

  it("shows a load error without hiding the page shell", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        loadError="Impossible de charger les Bookmarks."
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stashbox" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les Bookmarks.");
  });

  it("switches the visible theme from the header", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Activer le thème sombre" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Activer le thème clair" })).toBeInTheDocument();
  });

  it("keeps the selected theme for the next page load", () => {
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Activer le thème sombre" }));

    expect(localStorage.getItem("stashbox-theme")).toBe("dark");
  });

  it("uses the OS dark preference when no theme was selected", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
    }));

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(screen.getByRole("button", { name: "Activer le thème clair" })).toBeInTheDocument();
  });

  it("restores the stored theme before using the OS preference", async () => {
    localStorage.setItem("stashbox-theme", "dark");
    vi.stubGlobal("matchMedia", () => ({ matches: false }));

    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(screen.getByRole("button", { name: "Activer le thème clair" })).toBeInTheDocument();
  });

  it("saves a Bookmark URL from the first grid slot and clears the input", async () => {
    const saveBookmark = vi.fn().mockResolvedValue(undefined);
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={saveBookmark}
        onDeleteBookmark={async () => {}}
      />,
    );

    const gridItems = within(screen.getByRole("list", { name: "Bookmarks" })).getAllByRole(
      "listitem",
    );
    const addCard = within(gridItems[0]!).getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");

    fireEvent.change(input, { target: { value: "https://example.com/new" } });
    fireEvent.click(within(addCard).getByRole("button", { name: "Sauvegarder" }));

    await waitFor(() => expect(saveBookmark).toHaveBeenCalledWith("https://example.com/new"));
    expect(input).toHaveValue("");
  });

  it("shows an inline error without saving when the Bookmark URL is invalid", () => {
    const saveBookmark = vi.fn().mockResolvedValue(undefined);
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={saveBookmark}
        onDeleteBookmark={async () => {}}
      />,
    );

    const addCard = screen.getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");
    fireEvent.change(input, {
      target: { value: "not-a-url" },
    });
    fireEvent.click(within(addCard).getByRole("button", { name: "Sauvegarder" }));

    expect(within(addCard).getByRole("alert")).toHaveTextContent("Saisissez une URL valide.");
    expect(input).toHaveAccessibleDescription("Saisissez une URL valide.");
    expect(saveBookmark).not.toHaveBeenCalled();
  });

  it("explains when the Bookmark is already saved", async () => {
    const saveBookmark = vi.fn().mockResolvedValue({ alreadySaved: true });
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={saveBookmark}
        onDeleteBookmark={async () => {}}
      />,
    );

    const addCard = screen.getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");

    fireEvent.change(input, { target: { value: "https://example.com/new" } });
    fireEvent.click(within(addCard).getByRole("button", { name: "Sauvegarder" }));

    expect(await within(addCard).findByRole("alert")).toHaveTextContent(
      "Ce Bookmark est déjà sauvegardé.",
    );
    expect(input).toHaveValue("https://example.com/new");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("disables the Save controls while the Bookmark is being saved", async () => {
    let finishSave!: () => void;
    const saveBookmark = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={saveBookmark}
        onDeleteBookmark={async () => {}}
      />,
    );

    const addCard = screen.getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");
    const button = within(addCard).getByRole("button", { name: "Sauvegarder" });

    fireEvent.change(input, { target: { value: "https://example.com/new" } });
    fireEvent.click(button);

    await waitFor(() => expect(input).toBeDisabled());
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Sauvegarde...");

    finishSave();
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it("shows a server error without clearing the Bookmark URL", async () => {
    const saveBookmark = vi.fn().mockRejectedValue(new Error("API unavailable"));
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[]}
        onSaveBookmark={saveBookmark}
        onDeleteBookmark={async () => {}}
      />,
    );

    const addCard = screen.getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");

    fireEvent.change(input, { target: { value: "https://example.com/new" } });
    fireEvent.click(within(addCard).getByRole("button", { name: "Sauvegarder" }));

    expect(await within(addCard).findByRole("alert")).toHaveTextContent(
      "Impossible de sauvegarder le Bookmark.",
    );
    expect(input).toHaveValue("https://example.com/new");
  });

  it("keeps the Bookmark when the delete confirmation is cancelled", () => {
    const deleteBookmark = vi.fn().mockResolvedValue(undefined);
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={deleteBookmark}
      />,
    );

    const card = screen.getByRole("article", { name: "Readable systems" });
    fireEvent.click(within(card).getByRole("button", { name: "Supprimer Readable systems" }));

    expect(
      screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.queryByRole("alertdialog", { name: "Supprimer ce bookmark ?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(deleteBookmark).not.toHaveBeenCalled();
  });

  it("deletes the Bookmark and removes it from the grid when deletion is confirmed", async () => {
    const deleteBookmark = vi.fn().mockResolvedValue(undefined);
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={deleteBookmark}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Readable systems" })).getByRole("button", {
        name: "Supprimer Readable systems",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" })).getByRole(
        "button",
        { name: "Supprimer" },
      ),
    );

    await waitFor(() =>
      expect(deleteBookmark).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001"),
    );
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByText("0 Bookmarks")).toBeInTheDocument();
  });

  it("removes the Bookmark immediately while deletion is in flight", async () => {
    let finishDelete!: () => void;
    const deleteBookmark = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        }),
    );
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={deleteBookmark}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Readable systems" })).getByRole("button", {
        name: "Supprimer Readable systems",
      }),
    );
    const dialog = screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" });
    const confirmButton = within(dialog).getByRole("button", { name: "Supprimer" });

    fireEvent.click(confirmButton);

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("alertdialog", { name: "Supprimer ce bookmark ?" }),
    ).not.toBeInTheDocument();

    finishDelete();
    await waitFor(() => expect(deleteBookmark).toHaveBeenCalledTimes(1));
  });

  it("restores the Bookmark when deletion fails", async () => {
    const deleteBookmark = vi.fn().mockRejectedValue(new Error("API unavailable"));
    renderPage(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={deleteBookmark}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Readable systems" })).getByRole("button", {
        name: "Supprimer Readable systems",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" })).getByRole(
        "button",
        { name: "Supprimer" },
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument(),
    );
    expect(deleteBookmark).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
  });
});

function renderPage(page: ReactElement) {
  return render(<ThemeProvider>{page}</ThemeProvider>);
}

async function selectBookmarkType(type: string) {
  installScrollIntoViewPolyfill();
  const trigger = screen.getByRole("combobox", { name: "Filtrer par type" });

  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: type }));
}

function installScrollIntoViewPolyfill() {
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => {},
    });
  }
}

function createBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    url: "https://example.com/readable-systems",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Readable systems",
    description: "A useful article",
    tags: ["architecture"],
    embedding: null,
    ogImage: null,
    embedData: null,
    enrichmentStatus: "done",
    enrichmentError: null,
    enrichmentFailureReason: null,
    enrichmentAttempts: 1,
    enrichedAt: "2026-05-06T06:00:00.000Z",
    embeddingSourceText: "Readable systems / article",
    savedAt: "2026-05-06T06:00:00.000Z",
    savedCount: 1,
    lastSavedAt: "2026-05-06T06:00:00.000Z",
    savedFrom: ["api"],
    ...overrides,
  };
}
