import { describe, it, expect, vi } from "vitest";
import type { StashboxClient } from "@stashbox/api-client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function text(result: CallToolResult): string {
  const c = result.content[0];
  if (!c || c.type !== "text") throw new Error("Expected text content");
  return c.text;
}
import {
  searchSemantic,
  listRecent,
  listByTag,
  getBookmark,
  listTags,
  listFailed,
  deleteBookmark,
  refreshBookmark,
} from "../src/tools.js";

const bookmark = {
  id: "b1b1b1b1-0000-0000-0000-000000000001",
  url: "https://example.com",
  urlHash: "a".repeat(64),
  type: "article" as const,
  title: "Example",
  description: "Desc",
  tags: ["tag1"],
  embedding: null,
  ogImage: null,
  embedData: null,
  enrichmentStatus: "done" as const,
  enrichmentError: null,
  enrichmentFailureReason: null,
  enrichmentAttempts: 1,
  enrichedAt: "2024-01-01T00:00:00.000Z",
  embeddingSourceText: null,
  savedAt: "2024-01-01T00:00:00.000Z",
  savedCount: 1,
  lastSavedAt: "2024-01-01T00:00:00.000Z",
  savedFrom: ["cli" as const],
};

function makeClient(overrides: Partial<StashboxClient> = {}): StashboxClient {
  return {
    search: vi.fn().mockResolvedValue([bookmark]),
    list: vi.fn().mockResolvedValue([bookmark]),
    failed: vi.fn().mockResolvedValue([bookmark]),
    get: vi.fn().mockResolvedValue(bookmark),
    add: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue({ id: bookmark.id }),
    tags: vi.fn().mockResolvedValue([{ tag: "tag1", count: 3 }]),
    ...overrides,
  } as unknown as StashboxClient;
}

describe("search_semantic", () => {
  it("calls client.search and returns JSON", async () => {
    const client = makeClient();
    const result = await searchSemantic(client, { query: "typescript tips" });

    expect(client.search).toHaveBeenCalledWith({
      query: "typescript tips",
      limit: undefined,
      type: undefined,
      minScore: undefined,
      tags: undefined,
    });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual([bookmark]);
  });

  it("forwards optional params", async () => {
    const client = makeClient();
    await searchSemantic(client, {
      query: "q",
      limit: 5,
      type: "article",
      min_score: 0.7,
      tags: ["a"],
    });

    expect(client.search).toHaveBeenCalledWith({
      query: "q",
      limit: 5,
      type: "article",
      minScore: 0.7,
      tags: ["a"],
    });
  });

  it("returns error on failure", async () => {
    const client = makeClient({ search: vi.fn().mockRejectedValue(new Error("HTTP 401")) });
    const result = await searchSemantic(client, { query: "q" });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain("HTTP 401");
  });
});

describe("list_recent", () => {
  it("calls client.list without tag and returns JSON", async () => {
    const client = makeClient();
    const result = await listRecent(client, {});

    expect(client.list).toHaveBeenCalledWith({
      limit: undefined,
      offset: undefined,
      type: undefined,
    });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual([bookmark]);
  });

  it("returns error on failure", async () => {
    const client = makeClient({ list: vi.fn().mockRejectedValue(new Error("network")) });
    const result = await listRecent(client, {});
    expect(result.isError).toBe(true);
  });
});

describe("list_by_tag", () => {
  it("calls client.list with tag", async () => {
    const client = makeClient();
    const result = await listByTag(client, { tag: "typescript" });

    expect(client.list).toHaveBeenCalledWith({
      tag: "typescript",
      limit: undefined,
      offset: undefined,
    });
    expect(result.isError).toBeFalsy();
  });

  it("returns error on failure", async () => {
    const client = makeClient({ list: vi.fn().mockRejectedValue(new Error("oops")) });
    const result = await listByTag(client, { tag: "x" });
    expect(result.isError).toBe(true);
  });
});

describe("get_bookmark", () => {
  it("calls client.get and returns JSON", async () => {
    const client = makeClient();
    const result = await getBookmark(client, { id: bookmark.id });

    expect(client.get).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual(bookmark);
  });

  it("returns error on failure", async () => {
    const client = makeClient({ get: vi.fn().mockRejectedValue(new Error("not found")) });
    const result = await getBookmark(client, { id: "bad-id" });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("not found");
  });
});

describe("list_tags", () => {
  it("calls client.tags and returns JSON", async () => {
    const client = makeClient();
    const result = await listTags(client, {});

    expect(client.tags).toHaveBeenCalledWith(undefined);
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual([{ tag: "tag1", count: 3 }]);
  });

  it("forwards min_count", async () => {
    const client = makeClient();
    await listTags(client, { min_count: 2 });
    expect(client.tags).toHaveBeenCalledWith(2);
  });

  it("returns error on failure", async () => {
    const client = makeClient({ tags: vi.fn().mockRejectedValue(new Error("err")) });
    const result = await listTags(client, {});
    expect(result.isError).toBe(true);
  });
});

describe("list_failed", () => {
  it("calls client.failed and returns JSON", async () => {
    const client = makeClient();
    const result = await listFailed(client, {});

    expect(client.failed).toHaveBeenCalledWith({ limit: undefined });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual([bookmark]);
  });

  it("returns error on failure", async () => {
    const client = makeClient({ failed: vi.fn().mockRejectedValue(new Error("err")) });
    const result = await listFailed(client, {});
    expect(result.isError).toBe(true);
  });
});

describe("delete_bookmark", () => {
  it("calls client.delete and returns confirmation", async () => {
    const client = makeClient();
    const result = await deleteBookmark(client, { id: bookmark.id });

    expect(client.delete).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toMatchObject({ deleted: true, id: bookmark.id });
  });

  it("returns error on failure", async () => {
    const client = makeClient({ delete: vi.fn().mockRejectedValue(new Error("not found")) });
    const result = await deleteBookmark(client, { id: "bad" });
    expect(result.isError).toBe(true);
  });
});

describe("refresh_bookmark", () => {
  it("calls client.refresh and returns the id", async () => {
    const client = makeClient();
    const result = await refreshBookmark(client, { id: bookmark.id });

    expect(client.refresh).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual({ id: bookmark.id });
  });

  it("returns error on failure", async () => {
    const client = makeClient({ refresh: vi.fn().mockRejectedValue(new Error("err")) });
    const result = await refreshBookmark(client, { id: "bad" });
    expect(result.isError).toBe(true);
  });
});
