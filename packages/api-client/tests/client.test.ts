import { describe, it, expect, vi, beforeEach } from "vitest";
import { StashboxClient } from "../src/client.js";
import type { Bookmark } from "@stashbox/shared";

const BASE_URL = "http://localhost:3333";
const API_KEY = "test-key";

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    url: "https://example.com",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Example",
    description: "A description",
    tags: ["dev"],
    embedding: null,
    ogImage: null,
    embedData: null,
    enrichmentStatus: "done",
    enrichmentError: null,
    enrichmentFailureReason: null,
    enrichmentAttempts: 1,
    enrichedAt: "2024-01-01T00:00:00.000Z",
    embeddingSourceText: null,
    savedAt: "2024-01-01T00:00:00.000Z",
    savedCount: 1,
    lastSavedAt: "2024-01-01T00:00:00.000Z",
    savedFrom: ["cli"],
    ...overrides,
  };
}

describe("StashboxClient", () => {
  let client: StashboxClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new StashboxClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetch: fetchMock });
  });

  describe("search", () => {
    it("sends POST /search with bearer auth and returns bookmarks", async () => {
      const bookmark = makeBookmark();
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [bookmark] }),
      });

      const results = await client.search({ query: "typescript" });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/search`);
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${API_KEY}`);
      expect(JSON.parse(init.body as string)).toEqual({ query: "typescript" });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(bookmark.id);
    });

    it("forwards optional search params", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });

      await client.search({ query: "ml", limit: 5, type: "article", minScore: 0.6 });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        query: "ml",
        limit: 5,
        type: "article",
        minScore: 0.6,
      });
    });

    it("throws on non-ok response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauthorized", message: "Unauthorized" }),
      });

      await expect(client.search({ query: "test" })).rejects.toThrow("unauthorized");
    });
  });

  describe("list", () => {
    it("sends GET /bookmarks and returns bookmarks", async () => {
      const bookmark = makeBookmark();
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [bookmark] }) });

      const results = await client.list();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks`);
      expect(init.method).toBe("GET");
      expect(results[0]?.id).toBe(bookmark.id);
    });

    it("appends query params when provided", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });

      await client.list({ limit: 10, tag: "dev", type: "article" });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("limit=10");
      expect(url).toContain("tag=dev");
      expect(url).toContain("type=article");
    });
  });

  describe("failed", () => {
    it("sends GET /bookmarks/failed", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });

      await client.failed();

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks/failed`);
    });
  });

  describe("get", () => {
    it("sends GET /bookmarks/:id", async () => {
      const bookmark = makeBookmark();
      fetchMock.mockResolvedValue({ ok: true, json: async () => bookmark });

      const result = await client.get(bookmark.id);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks/${bookmark.id}`);
      expect(result.id).toBe(bookmark.id);
    });
  });

  describe("add", () => {
    it("sends POST /bookmarks and returns created bookmark", async () => {
      const bookmark = makeBookmark();
      fetchMock.mockResolvedValue({ ok: true, json: async () => bookmark });

      const result = await client.add({ url: "https://example.com" });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ url: "https://example.com" });
      expect(result.id).toBe(bookmark.id);
    });
  });

  describe("delete", () => {
    it("sends DELETE /bookmarks/:id", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

      await client.delete("some-id");

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks/some-id`);
      expect(init.method).toBe("DELETE");
    });
  });

  describe("refresh", () => {
    it("sends POST /bookmarks/:id/refresh", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "some-id" }) });

      const result = await client.refresh("some-id");

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/bookmarks/some-id/refresh`);
      expect(init.method).toBe("POST");
      expect(result.id).toBe("some-id");
    });
  });

  describe("tags", () => {
    it("sends GET /tags and returns tag list", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ tag: "dev", count: 5 }] }),
      });

      const results = await client.tags();

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/tags`);
      expect(results[0]?.tag).toBe("dev");
    });

    it("forwards minCount param", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });

      await client.tags(3);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("minCount=3");
    });
  });
});
