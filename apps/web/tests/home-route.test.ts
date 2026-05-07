import type { Bookmark } from "@stashbox/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("home route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads the first page of Bookmarks through the server function", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const bookmark = createBookmark({ title: "Readable systems" });
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ results: [bookmark] });
    });

    const { Route } = await import("~/routes/index.tsx");

    await expect(Route.options.loader?.({} as never)).resolves.toEqual([bookmark]);
    expect(requests[0]?.url).toBe("https://stashbox.example/bookmarks?limit=48&offset=0");
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
