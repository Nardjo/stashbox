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
