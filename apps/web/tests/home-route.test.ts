import type { Tag } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("home route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads the first page of Bookmarks and Tags through the server functions", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const bookmarks = Array.from({ length: 48 }, (_, index) =>
      createBookmark({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        title: `Readable systems ${index + 1}`,
      }),
    );
    const tags: Tag[] = [{ tag: "architecture", count: 1 }];
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith("/tags")) return Response.json({ results: tags });
      if (String(url).endsWith("/site-credentials")) return Response.json({ results: [] });
      return Response.json({ results: bookmarks });
    });

    const { loadInitialBrowseDataFromApi } = await import("~/server/stashbox.ts");

    await expect(loadInitialBrowseDataFromApi()).resolves.toEqual({
      bookmarkPageSize: 48,
      bookmarks,
      hasMoreBookmarks: true,
      siteCredentials: [],
      tags,
    });
    expect(requests.map((request) => request.url)).toEqual([
      "https://stashbox.example/bookmarks?limit=48&offset=0",
      "https://stashbox.example/site-credentials",
      "https://stashbox.example/tags",
    ]);
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
