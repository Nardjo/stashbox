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

    fireEvent.change(screen.getByLabelText("Filtrer par texte"), {
      target: { value: "pagination" },
    });

    expect(screen.queryByRole("article", { name: "Pagination systems" })).not.toBeInTheDocument();
    expect(screen.getByText("0 Bookmarks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Charger plus" })).toBeInTheDocument();
  });

  it("filters Bookmarks by title or URL text", () => {
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

    fireEvent.change(screen.getByLabelText("Filtrer par texte"), {
      target: { value: "docs.example" },
    });

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Vue patterns" })).toBeInTheDocument();
    expect(screen.getByText("1 Bookmark")).toBeInTheDocument();
  });

  it("filters Bookmarks by selected type", () => {
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

    fireEvent.change(screen.getByLabelText("Filtrer par type"), {
      target: { value: "youtube" },
    });

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt walkthrough" })).toBeInTheDocument();
    expect(screen.getByText("1 Bookmark")).toBeInTheDocument();
  });

  it("filters Bookmarks by selected Tags with OR semantics and combines other filters with AND", () => {
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
            title: "Nuxt patterns",
            type: "youtube",
            tags: ["vue"],
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000003",
            title: "Nuxt architecture",
            type: "youtube",
            tags: ["architecture"],
          }),
          createBookmark({
            id: "00000000-0000-4000-8000-000000000004",
            title: "Nuxt design",
            type: "youtube",
            tags: ["design"],
          }),
        ]}
        tags={[
          { tag: "architecture", count: 2 },
          { tag: "vue", count: 1 },
          { tag: "design", count: 1 },
        ]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filtrer par texte"), {
      target: { value: "nuxt" },
    });
    fireEvent.change(screen.getByLabelText("Filtrer par type"), {
      target: { value: "youtube" },
    });
    fireEvent.click(screen.getByLabelText("architecture (2)"));
    fireEvent.click(screen.getByLabelText("vue (1)"));

    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt patterns" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt architecture" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Nuxt design" })).not.toBeInTheDocument();
    expect(screen.getByText("2 Bookmarks")).toBeInTheDocument();
  });

  it("syncs active filters to the URL and clears them from the grid", () => {
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
        tags={[{ tag: "architecture", count: 2 }]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filtrer par texte"), {
      target: { value: "nuxt" },
    });
    fireEvent.change(screen.getByLabelText("Filtrer par type"), {
      target: { value: "youtube" },
    });
    fireEvent.click(screen.getByLabelText("architecture (2)"));

    const activeParams = new URLSearchParams(window.location.search);
    expect(activeParams.get("q")).toBe("nuxt");
    expect(activeParams.get("type")).toBe("youtube");
    expect(activeParams.get("tags")).toBe("architecture");
    expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt architecture" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Effacer les filtres" }));

    expect(window.location.search).toBe("");
    expect(screen.getByLabelText("Filtrer par texte")).toHaveValue("");
    expect(screen.getByLabelText("Filtrer par type")).toHaveValue("");
    expect(screen.getByLabelText("architecture (2)")).not.toBeChecked();
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Nuxt architecture" })).toBeInTheDocument();
    expect(screen.getByText("2 Bookmarks")).toBeInTheDocument();
  });

  it("initializes active filters from the URL query string", () => {
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
        tags={[{ tag: "architecture", count: 2 }]}
        onSaveBookmark={async () => {}}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByLabelText("Filtrer par texte")).toHaveValue("nuxt");
    expect(screen.getByLabelText("Filtrer par type")).toHaveValue("youtube");
    expect(screen.getByLabelText("architecture (2)")).toBeChecked();
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

  it("disables the delete confirmation while deletion is in flight", async () => {
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

    await waitFor(() => expect(confirmButton).toBeDisabled());
    expect(confirmButton).toHaveTextContent("Suppression...");
    expect(within(dialog).getByRole("button", { name: "Annuler" })).toBeDisabled();

    finishDelete();
    await waitFor(() =>
      expect(screen.queryByRole("article", { name: "Readable systems" })).not.toBeInTheDocument(),
    );
  });
});

function renderPage(page: ReactElement) {
  return render(<ThemeProvider>{page}</ThemeProvider>);
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
