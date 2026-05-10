import type { Bookmark } from "@stashbox/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookmarkCard } from "~/components/bookmarks/bookmark-card.tsx";

describe("BookmarkCard", () => {
  it("shows the Bookmark title, domain, Tags, and Type", () => {
    render(<BookmarkCard bookmark={createBookmark()} onDeleteBookmark={async () => {}} />);

    expect(screen.getByRole("article", { name: /Readable systems/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("architecture")).toBeInTheDocument();
    expect(screen.getByText("article")).toBeInTheDocument();
  });

  it("shows the Open Graph thumbnail when available", () => {
    render(
      <BookmarkCard
        bookmark={createBookmark({ ogImage: "https://example.com/og.png" })}
        onDeleteBookmark={async () => {}}
      />,
    );

    expect(screen.getByRole("img", { name: "Aperçu de Readable systems" })).toHaveAttribute(
      "src",
      "https://example.com/og.png",
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
