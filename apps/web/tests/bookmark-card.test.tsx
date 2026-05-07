import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Bookmark } from "@stashbox/shared";
import { BookmarkCard } from "~/components/bookmarks/bookmark-card.tsx";

describe("BookmarkCard", () => {
  it("shows the Bookmark title, domain, Tags, and Type", () => {
    render(<BookmarkCard bookmark={createBookmark()} />);

    expect(screen.getByRole("article", { name: /Readable systems/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Readable systems" })).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("architecture")).toBeInTheDocument();
    expect(screen.getByText("article")).toBeInTheDocument();
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
