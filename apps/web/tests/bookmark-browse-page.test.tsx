import type { Bookmark } from "@stashbox/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BookmarkBrowsePage } from "~/components/bookmarks/bookmark-browse-page.tsx";

describe("BookmarkBrowsePage", () => {
  it("renders loaded Bookmarks in the browse grid", () => {
    render(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stashbox" })).toBeInTheDocument();
    expect(screen.getByText("1 Bookmark"));
    expect(screen.getByRole("list", { name: "Bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
  });

  it("pluralizes the Bookmark count", () => {
    render(
      <BookmarkBrowsePage
        bookmarks={[
          createBookmark({ id: "00000000-0000-4000-8000-000000000001" }),
          createBookmark({ id: "00000000-0000-4000-8000-000000000002" }),
        ]}
        onSaveBookmark={async () => {}}
      />,
    );

    expect(screen.getByText("2 Bookmarks")).toBeInTheDocument();
  });

  it("shows a load error without hiding the page shell", () => {
    render(
      <BookmarkBrowsePage
        bookmarks={[]}
        loadError="Impossible de charger les Bookmarks."
        onSaveBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stashbox" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les Bookmarks.");
  });

  it("saves a Bookmark URL from the first grid slot and clears the input", async () => {
    const saveBookmark = vi.fn().mockResolvedValue(undefined);
    render(
      <BookmarkBrowsePage
        bookmarks={[createBookmark({ title: "Readable systems" })]}
        onSaveBookmark={saveBookmark}
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
    render(<BookmarkBrowsePage bookmarks={[]} onSaveBookmark={saveBookmark} />);

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
    render(<BookmarkBrowsePage bookmarks={[]} onSaveBookmark={saveBookmark} />);

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
    render(<BookmarkBrowsePage bookmarks={[]} onSaveBookmark={saveBookmark} />);

    const addCard = screen.getByRole("form", { name: "Sauvegarder un Bookmark" });
    const input = within(addCard).getByLabelText("URL du Bookmark");

    fireEvent.change(input, { target: { value: "https://example.com/new" } });
    fireEvent.click(within(addCard).getByRole("button", { name: "Sauvegarder" }));

    expect(await within(addCard).findByRole("alert")).toHaveTextContent(
      "Impossible de sauvegarder le Bookmark.",
    );
    expect(input).toHaveValue("https://example.com/new");
  });
});

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
