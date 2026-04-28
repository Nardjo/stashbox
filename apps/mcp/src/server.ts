import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StashitClient } from "@stashit/api-client";
import {
  searchSemantic,
  listRecent,
  listByTag,
  getBookmark,
  listTags,
  listFailed,
  deleteBookmark,
  refreshBookmark,
} from "./tools.js";

export function createServer(client: StashitClient): McpServer {
  const server = new McpServer({
    name: "stashit",
    version: "0.1.0",
  });

  server.registerTool(
    "search_semantic",
    {
      description: "Semantic search across your bookmarks using natural language",
      inputSchema: {
        query: z.string().describe("Natural language search query"),
        limit: z.number().int().positive().optional().describe("Maximum number of results"),
        type: z
          .enum(["tweet", "youtube", "article", "image", "pdf", "other"])
          .optional()
          .describe("Filter by bookmark type"),
        min_score: z.number().min(0).max(1).optional().describe("Minimum similarity score (0–1)"),
        tags: z.array(z.string()).optional().describe("Filter by tags"),
      },
    },
    (args) => searchSemantic(client, args),
  );

  server.registerTool(
    "list_recent",
    {
      description: "List recent bookmarks in reverse chronological order",
      inputSchema: {
        limit: z.number().int().positive().optional().describe("Maximum number of results"),
        offset: z.number().int().nonnegative().optional().describe("Pagination offset"),
        type: z
          .enum(["tweet", "youtube", "article", "image", "pdf", "other"])
          .optional()
          .describe("Filter by type"),
      },
    },
    (args) => listRecent(client, args),
  );

  server.registerTool(
    "list_by_tag",
    {
      description: "List bookmarks that have a specific tag",
      inputSchema: {
        tag: z.string().describe("Tag to filter by"),
        limit: z.number().int().positive().optional().describe("Maximum number of results"),
        offset: z.number().int().nonnegative().optional().describe("Pagination offset"),
      },
    },
    (args) => listByTag(client, args),
  );

  server.registerTool(
    "get_bookmark",
    {
      description: "Get a single bookmark by its UUID",
      inputSchema: {
        id: z.string().uuid().describe("Bookmark UUID"),
      },
    },
    (args) => getBookmark(client, args),
  );

  server.registerTool(
    "list_tags",
    {
      description: "List all tags with their bookmark counts",
      inputSchema: {
        min_count: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Minimum bookmark count to include a tag"),
      },
    },
    (args) => listTags(client, args),
  );

  server.registerTool(
    "list_failed",
    {
      description: "List bookmarks whose enrichment has failed",
      inputSchema: {
        limit: z.number().int().positive().optional().describe("Maximum number of results"),
      },
    },
    (args) => listFailed(client, args),
  );

  server.registerTool(
    "delete_bookmark",
    {
      description: "Permanently delete a bookmark by its UUID",
      inputSchema: {
        id: z.string().uuid().describe("Bookmark UUID"),
      },
    },
    (args) => deleteBookmark(client, args),
  );

  server.registerTool(
    "refresh_bookmark",
    {
      description: "Re-trigger enrichment for a bookmark",
      inputSchema: {
        id: z.string().uuid().describe("Bookmark UUID"),
      },
    },
    (args) => refreshBookmark(client, args),
  );

  return server;
}
