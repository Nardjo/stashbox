import type { StashitClient } from "@stashit/api-client";
import type { BookmarkType } from "@stashit/shared";
import { formatBookmark, toJson } from "../format.js";

interface SearchOptions {
  query: string;
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
  limit?: number;
  type?: BookmarkType;
  minScore?: number;
}

export async function runSearch(opts: SearchOptions): Promise<void> {
  const results = await opts.client.search({
    query: opts.query,
    ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.minScore !== undefined ? { minScore: opts.minScore } : {}),
  });

  if (opts.json) {
    opts.print(toJson(results));
    return;
  }

  if (results.length === 0) {
    opts.print("No results found.");
    return;
  }

  results.forEach((b) => opts.print(formatBookmark(b)));
}
