import type { Bookmark } from "@stashbox/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookmarkGrid } from "~/components/bookmarks/bookmark-grid.tsx";

describe("BookmarkGrid", () => {
  it("renders Bookmark cards in a browse grid", () => {
    render(
      <BookmarkGrid
        bookmarks={[
          createBookmark({ id: "00000000-0000-4000-8000-000000000001", title: "Readable systems" }),
          createBookmark({ id: "00000000-0000-4000-8000-000000000002", title: "Semantic notes" }),
        ]}
      />,
    );

    const grid = screen.getByRole("list", { name: "Bookmarks" });
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4");
    expect(within(grid).getByRole("article", { name: "Readable systems" })).toBeInTheDocument();
    expect(within(grid).getByRole("article", { name: "Semantic notes" })).toBeInTheDocument();
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
