import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Bookmark } from "@stashit/shared";
import type { StashitClient } from "@stashit/api-client";
import { runSearch } from "../src/commands/search.js";
import { runList } from "../src/commands/list.js";
import { runGet } from "../src/commands/get.js";
import { runAdd } from "../src/commands/add.js";
import { runDelete } from "../src/commands/delete.js";
import { runRefresh } from "../src/commands/refresh.js";
import { runFailed } from "../src/commands/failed.js";
import { runTags } from "../src/commands/tags.js";

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    url: "https://example.com",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Example Title",
    description: "A description",
    tags: ["dev", "ts"],
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

function makeClient(overrides: Partial<StashitClient> = {}): StashitClient {
  return {
    search: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    failed: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    add: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
    tags: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as StashitClient;
}

describe("search command", () => {
  it("outputs JSON array when --json flag is set", async () => {
    const bookmark = makeBookmark();
    const client = makeClient({ search: vi.fn().mockResolvedValue([bookmark]) });
    const lines: string[] = [];

    await runSearch({ query: "typescript", json: true, client, print: (l) => lines.push(l) });

    expect(client.search).toHaveBeenCalledWith({ query: "typescript" });
    const parsed = JSON.parse(lines.join(""));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe(bookmark.id);
  });

  it("outputs human-readable lines by default", async () => {
    const bookmark = makeBookmark();
    const client = makeClient({ search: vi.fn().mockResolvedValue([bookmark]) });
    const lines: string[] = [];

    await runSearch({ query: "typescript", json: false, client, print: (l) => lines.push(l) });

    const output = lines.join("\n");
    expect(output).toContain(bookmark.title);
    expect(output).toContain(bookmark.url);
  });

  it("prints empty message when no results", async () => {
    const client = makeClient({ search: vi.fn().mockResolvedValue([]) });
    const lines: string[] = [];

    await runSearch({ query: "nothing", json: false, client, print: (l) => lines.push(l) });

    expect(lines.join("")).toContain("No results");
  });
});

describe("list command", () => {
  it("calls client.list and outputs results as JSON", async () => {
    const bookmark = makeBookmark();
    const client = makeClient({ list: vi.fn().mockResolvedValue([bookmark]) });
    const lines: string[] = [];

    await runList({ json: true, client, print: (l) => lines.push(l) });

    expect(client.list).toHaveBeenCalled();
    const parsed = JSON.parse(lines.join(""));
    expect(parsed[0].id).toBe(bookmark.id);
  });
});

describe("get command", () => {
  it("calls client.get with id and outputs JSON", async () => {
    const bookmark = makeBookmark();
    const client = makeClient({ get: vi.fn().mockResolvedValue(bookmark) });
    const lines: string[] = [];

    await runGet({ id: bookmark.id, json: true, client, print: (l) => lines.push(l) });

    expect(client.get).toHaveBeenCalledWith(bookmark.id);
    const parsed = JSON.parse(lines.join(""));
    expect(parsed.id).toBe(bookmark.id);
  });
});

describe("add command", () => {
  it("calls client.add and prints the created bookmark as JSON", async () => {
    const bookmark = makeBookmark();
    const client = makeClient({ add: vi.fn().mockResolvedValue(bookmark) });
    const lines: string[] = [];

    await runAdd({ url: "https://example.com", json: true, client, print: (l) => lines.push(l) });

    expect(client.add).toHaveBeenCalledWith({ url: "https://example.com" });
    const parsed = JSON.parse(lines.join(""));
    expect(parsed.id).toBe(bookmark.id);
  });
});

describe("delete command", () => {
  it("calls client.delete and confirms deletion", async () => {
    const client = makeClient({ delete: vi.fn().mockResolvedValue(undefined) });
    const lines: string[] = [];

    await runDelete({ id: "some-id", json: false, client, print: (l) => lines.push(l) });

    expect(client.delete).toHaveBeenCalledWith("some-id");
    expect(lines.join("")).toContain("some-id");
  });

  it("outputs JSON on --json", async () => {
    const client = makeClient({ delete: vi.fn().mockResolvedValue(undefined) });
    const lines: string[] = [];

    await runDelete({ id: "some-id", json: true, client, print: (l) => lines.push(l) });

    const parsed = JSON.parse(lines.join(""));
    expect(parsed.deleted).toBe("some-id");
  });
});

describe("refresh command", () => {
  it("calls client.refresh and prints result", async () => {
    const client = makeClient({ refresh: vi.fn().mockResolvedValue({ id: "some-id" }) });
    const lines: string[] = [];

    await runRefresh({ id: "some-id", json: true, client, print: (l) => lines.push(l) });

    expect(client.refresh).toHaveBeenCalledWith("some-id");
    const parsed = JSON.parse(lines.join(""));
    expect(parsed.id).toBe("some-id");
  });
});

describe("failed command", () => {
  it("calls client.failed and returns results", async () => {
    const bookmark = makeBookmark({ enrichmentStatus: "failed" });
    const client = makeClient({ failed: vi.fn().mockResolvedValue([bookmark]) });
    const lines: string[] = [];

    await runFailed({ json: true, client, print: (l) => lines.push(l) });

    expect(client.failed).toHaveBeenCalled();
    const parsed = JSON.parse(lines.join(""));
    expect(parsed[0].enrichmentStatus).toBe("failed");
  });
});

describe("tags command", () => {
  it("calls client.tags and prints tag list as JSON", async () => {
    const client = makeClient({ tags: vi.fn().mockResolvedValue([{ tag: "dev", count: 3 }]) });
    const lines: string[] = [];

    await runTags({ json: true, client, print: (l) => lines.push(l) });

    const parsed = JSON.parse(lines.join(""));
    expect(parsed[0].tag).toBe("dev");
  });

  it("prints human-readable tag list", async () => {
    const client = makeClient({ tags: vi.fn().mockResolvedValue([{ tag: "dev", count: 3 }]) });
    const lines: string[] = [];

    await runTags({ json: false, client, print: (l) => lines.push(l) });

    expect(lines.join("\n")).toContain("dev");
  });
});
