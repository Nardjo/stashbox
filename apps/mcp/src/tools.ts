import type { StashboxClient } from "@stashbox/api-client";
import type { BookmarkType } from "@stashbox/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function err(e: unknown): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
  };
}

export async function searchSemantic(
  client: StashboxClient,
  args: { query: string; limit?: number; type?: string; min_score?: number; tags?: string[] },
): Promise<CallToolResult> {
  try {
    const results = await client.search({
      query: args.query,
      limit: args.limit,
      type: args.type as BookmarkType | undefined,
      minScore: args.min_score,
      tags: args.tags,
    });
    return ok(results);
  } catch (e) {
    return err(e);
  }
}

export async function listRecent(
  client: StashboxClient,
  args: { limit?: number; offset?: number; type?: string },
): Promise<CallToolResult> {
  try {
    const results = await client.list({
      limit: args.limit,
      offset: args.offset,
      type: args.type as BookmarkType | undefined,
    });
    return ok(results);
  } catch (e) {
    return err(e);
  }
}

export async function listByTag(
  client: StashboxClient,
  args: { tag: string; limit?: number; offset?: number },
): Promise<CallToolResult> {
  try {
    const results = await client.list({ tag: args.tag, limit: args.limit, offset: args.offset });
    return ok(results);
  } catch (e) {
    return err(e);
  }
}

export async function getBookmark(
  client: StashboxClient,
  args: { id: string },
): Promise<CallToolResult> {
  try {
    const bookmark = await client.get(args.id);
    return ok(bookmark);
  } catch (e) {
    return err(e);
  }
}

export async function listTags(
  client: StashboxClient,
  args: { min_count?: number },
): Promise<CallToolResult> {
  try {
    const tags = await client.tags(args.min_count);
    return ok(tags);
  } catch (e) {
    return err(e);
  }
}

export async function listFailed(
  client: StashboxClient,
  args: { limit?: number },
): Promise<CallToolResult> {
  try {
    const results = await client.failed({ limit: args.limit });
    return ok(results);
  } catch (e) {
    return err(e);
  }
}

export async function deleteBookmark(
  client: StashboxClient,
  args: { id: string },
): Promise<CallToolResult> {
  try {
    await client.delete(args.id);
    return ok({ deleted: true, id: args.id });
  } catch (e) {
    return err(e);
  }
}

export async function refreshBookmark(
  client: StashboxClient,
  args: { id: string },
): Promise<CallToolResult> {
  try {
    const result = await client.refresh(args.id);
    return ok(result);
  } catch (e) {
    return err(e);
  }
}
