import type { Bookmark } from "@stashbox/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BookmarkCard } from "~/components/bookmarks/bookmark-card.tsx";

describe("BookmarkCard", () => {
  it("shows the Bookmark title, domain, Tags, and Type", () => {
    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={async () => {}} />);

    expect(screen.getByRole("article", { name: /Readable systems/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("architecture")).toBeInTheDocument();
    expect(screen.getByText("article")).toBeInTheDocument();
    expect(screen.queryByText("A useful article")).not.toBeInTheDocument();
  });

  it("exposes card actions for opening, copying, and deleting", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={async () => {}} />);

    expect(screen.getByRole("link", { name: "Ouvrir Readable systems" })).toHaveAttribute(
      "href",
      "https://example.com/readable-systems",
    );
    expect(
      screen.getByRole("button", { name: "Copier l'URL de Readable systems" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer Readable systems" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copier l'URL de Readable systems" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://example.com/readable-systems"),
    );
    expect(screen.getByRole("button", { name: "URL copiée" })).toBeInTheDocument();
  });

  it("opens a detail modal from the full card and shows the hidden description", () => {
    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={async () => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Voir les détails de Readable systems" }));

    const dialog = screen.getByRole("dialog", { name: "Readable systems" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Aperçu de Readable systems" })).toHaveClass(
      "h-full",
      "scale-[1.08]",
    );
    expect(screen.getByText("A useful article")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/readable-systems")).toBeInTheDocument();
    expect(screen.getByText("Texte indexé")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le lien" })).toHaveAttribute(
      "href",
      "https://example.com/readable-systems",
    );
  });

  it("keeps delete action separate from the detail modal", () => {
    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={async () => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Supprimer Readable systems" }));

    expect(
      screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("A useful article")).not.toBeInTheDocument();
  });

  it("can delete from the detail modal after confirmation", async () => {
    const deleteBookmark = vi.fn().mockResolvedValue(undefined);

    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={deleteBookmark} />);

    fireEvent.click(screen.getByRole("button", { name: "Voir les détails de Readable systems" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));

    expect(screen.queryByRole("dialog", { name: "Readable systems" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("alertdialog", { name: "Supprimer ce bookmark ?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() =>
      expect(deleteBookmark).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001"),
    );
  });

  it("shows the Open Graph thumbnail when available", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ ogImage: "https://example.com/og.png" })}
        onDeleteBookmark={async () => {}}
      />,
    );

    const thumbnail = screen.getByRole("img", { name: "Aperçu de Readable systems" });

    expect(thumbnail).toHaveAttribute("src", "https://example.com/og.png");
    expect(thumbnail).toHaveClass("scale-[1.18]", "object-center");
  });

  it("prefers client capture over Open Graph for non-YouTube bookmarks", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({
          capture: createCapture("https://api.example.com/captures/article.png"),
          ogImage: "https://example.com/og.png",
        })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("img", { name: "Aperçu de Readable systems" })).toHaveAttribute(
      "src",
      "https://api.example.com/captures/article.png",
    );
  });

  it("prefers the YouTube thumbnail over client capture for YouTube bookmarks", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({
          type: "youtube",
          mediaProvider: "youtube",
          capture: createCapture("https://api.example.com/captures/youtube.png"),
          ogImage: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("img", { name: "Aperçu de Readable systems" })).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/abc/hqdefault.jpg",
    );
  });

  it("shows a domain fallback when no thumbnail is available", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ ogImage: null })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Aperçu indisponible pour example.com" }),
    ).toHaveTextContent("E");
  });

  it("shows a loading state while enrichment is pending", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ enrichmentStatus: "pending", ogImage: null })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("status", { name: "Enrichissement en cours" })).toBeInTheDocument();
  });

  it("uses the domain as title while enrichment has not populated one", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ enrichmentStatus: "pending", ogImage: null, title: "" })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("article", { name: "example.com" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "example.com" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer example.com" })).toBeInTheDocument();
  });

  it("shows a loading state while enrichment is running", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ enrichmentStatus: "enriching", ogImage: null })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("status", { name: "Enrichissement en cours" })).toBeInTheDocument();
  });

  it("shows a degraded status indicator", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ enrichmentStatus: "degraded", ogImage: null })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByText("Dégradé")).toBeInTheDocument();
  });

  it("keeps the Open Graph thumbnail for degraded Bookmarks when available", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({
          enrichmentStatus: "degraded",
          ogImage: "https://example.com/og.png",
        })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByText("Dégradé")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Aperçu de Readable systems" })).toHaveAttribute(
      "src",
      "https://example.com/og.png",
    );
  });

  it("shows a distinct failed visual indicator", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ enrichmentStatus: "failed", ogImage: null })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByText("Échec")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Enrichissement échoué pour example.com" }),
    ).toHaveTextContent("!");
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
    tags: ["architecture", "systems"],
    embedding: null,
    ogImage: "https://example.com/image.png",
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

function createCapture(url: string): NonNullable<Bookmark["capture"]> {
  return {
    url,
    source: "client",
    mimeType: "image/png",
    width: 1280,
    height: 720,
    byteSize: 123,
    capturedAt: "2026-05-06T06:00:00.000Z",
  };
}
