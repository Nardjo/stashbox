import { afterEach, describe, expect, it, vi } from "vitest";

describe("StashboxServerClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the Stashbox API env vars for server-side requests", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetch: typeof globalThis.fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return Response.json({ results: [] });
    };

    const { getStashboxServerClient } = await import("~/server/stashbox.ts");
    const client = getStashboxServerClient({ fetch });

    await client.list({ limit: 12, offset: 24 });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://stashbox.example/bookmarks?limit=12&offset=24");
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer secret-key",
    });
  });
});

describe("Bookmark server functions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lists Bookmarks through the server-side Stashbox API client", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const bookmark = createBookmark({ title: "Readable systems" });
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ results: [bookmark] });
    });

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(operations.listBookmarks({ limit: 10, offset: 20 })).resolves.toEqual([bookmark]);
    expect(requests[0]?.url).toBe("https://stashbox.example/bookmarks?limit=10&offset=20");
  });

  it("searches Bookmarks through the server-side Stashbox API client", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const bookmark = createBookmark({ title: "Semantic systems" });
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ results: [bookmark] });
    });

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(
      operations.searchBookmarks({
        query: "systems thinking",
        type: "article",
        tags: ["architecture"],
      }),
    ).resolves.toEqual([bookmark]);
    expect(requests[0]?.url).toBe("https://stashbox.example/search");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      query: "systems thinking",
      type: "article",
      tags: ["architecture"],
    });
  });

  it("adds a Bookmark through the server-side Stashbox API client", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const bookmark = createBookmark({ url: "https://example.com/new" });
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json(bookmark);
    });

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(operations.addBookmark({ url: "https://example.com/new" })).resolves.toEqual(
      bookmark,
    );
    expect(requests[0]?.url).toBe("https://stashbox.example/bookmarks");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({ url: "https://example.com/new" });
  });

  it("rejects non-http Bookmark URLs before calling the Stashbox API", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(operations.addBookmark({ url: "javascript:alert(1)" })).rejects.toThrow(
      "URL must use http or https",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deletes a Bookmark through the server-side Stashbox API client", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(null, { status: 204 });
    });

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(
      operations.deleteBookmark({ id: "00000000-0000-4000-8000-000000000001" }),
    ).resolves.toBeUndefined();
    expect(requests[0]?.url).toBe(
      "https://stashbox.example/bookmarks/00000000-0000-4000-8000-000000000001",
    );
    expect(requests[0]?.init?.method).toBe("DELETE");
  });

  it("lists Tags through the server-side Stashbox API client", async () => {
    vi.stubEnv("STASHBOX_API_URL", "https://stashbox.example");
    vi.stubEnv("STASHBOX_API_KEY", "secret-key");
    vi.resetModules();

    const tags = [{ tag: "architecture", count: 3 }];
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ results: tags });
    });

    const { createStashboxServerOperations } = await import("~/server/stashbox.ts");
    const operations = createStashboxServerOperations();

    await expect(operations.listTags()).resolves.toEqual(tags);
    expect(requests[0]?.url).toBe("https://stashbox.example/tags");
  });
});

function createBookmark(overrides: Partial<Record<string, unknown>> = {}) {
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
