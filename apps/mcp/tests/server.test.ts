import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { StashboxClient } from "@stashbox/api-client";
import { describe, expect, it, vi } from "vitest";

import { createServer } from "../src/server.js";

function text(result: unknown): string {
  const r = result as Record<string, unknown>;
  const content = r["content"];
  if (!Array.isArray(content)) throw new Error("Expected array content");
  const c = content[0] as { type?: string; text?: string } | undefined;
  if (!c || c.type !== "text" || !c.text) throw new Error("Expected text content");
  return c.text;
}

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

function makeClient(): StashboxClient {
  return {
    search: vi.fn().mockResolvedValue([bookmark]),
    list: vi.fn().mockResolvedValue([bookmark]),
    failed: vi.fn().mockResolvedValue([bookmark]),
    get: vi.fn().mockResolvedValue(bookmark),
    add: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue({ id: bookmark.id }),
    tags: vi.fn().mockResolvedValue([{ tag: "tag1", count: 3 }]),
  } as unknown as StashboxClient;
}

async function setup(stashboxClient: StashboxClient) {
  const server = createServer(stashboxClient);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const mcpClient = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([server.connect(serverTransport), mcpClient.connect(clientTransport)]);

  return { mcpClient, server, stashboxClient };
}

describe("MCP server tool registration", () => {
  const EXPECTED_TOOLS = [
    "search_semantic",
    "list_recent",
    "list_by_tag",
    "get_bookmark",
    "list_tags",
    "list_failed",
    "delete_bookmark",
    "refresh_bookmark",
  ];

  it("exposes all 8 tools", async () => {
    const { mcpClient, server } = await setup(makeClient());

    const { tools } = await mcpClient.listTools();
    const names = tools.map((t) => t.name);

    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }

    await server.close();
  });
});

describe("search_semantic via MCP", () => {
  it("routes call to client.search", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({
      name: "search_semantic",
      arguments: { query: "typescript" },
    });

    expect(stashboxClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "typescript" }),
    );
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(text(result));
    expect(parsed).toEqual([bookmark]);

    await server.close();
  });
});

describe("list_recent via MCP", () => {
  it("routes call to client.list", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({ name: "list_recent", arguments: {} });

    expect(stashboxClient.list).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("list_by_tag via MCP", () => {
  it("routes call to client.list with tag", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({
      name: "list_by_tag",
      arguments: { tag: "typescript" },
    });

    expect(stashboxClient.list).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "typescript" }),
    );
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("get_bookmark via MCP", () => {
  it("routes call to client.get", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({
      name: "get_bookmark",
      arguments: { id: bookmark.id },
    });

    expect(stashboxClient.get).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("list_tags via MCP", () => {
  it("routes call to client.tags", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({ name: "list_tags", arguments: {} });

    expect(stashboxClient.tags).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("list_failed via MCP", () => {
  it("routes call to client.failed", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({ name: "list_failed", arguments: {} });

    expect(stashboxClient.failed).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("delete_bookmark via MCP", () => {
  it("routes call to client.delete", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({
      name: "delete_bookmark",
      arguments: { id: bookmark.id },
    });

    expect(stashboxClient.delete).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(text(result));
    expect(parsed).toMatchObject({ deleted: true, id: bookmark.id });

    await server.close();
  });
});

describe("refresh_bookmark via MCP", () => {
  it("routes call to client.refresh", async () => {
    const stashboxClient = makeClient();
    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({
      name: "refresh_bookmark",
      arguments: { id: bookmark.id },
    });

    expect(stashboxClient.refresh).toHaveBeenCalledWith(bookmark.id);
    expect(result.isError).toBeFalsy();

    await server.close();
  });
});

describe("error surface", () => {
  it("returns isError with readable message on API failure", async () => {
    const stashboxClient = makeClient();
    vi.mocked(stashboxClient.search).mockRejectedValue(new Error("Unauthorized: invalid API key"));

    const { mcpClient, server } = await setup(stashboxClient);

    const result = await mcpClient.callTool({ name: "search_semantic", arguments: { query: "q" } });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Unauthorized");

    await server.close();
  });
});
