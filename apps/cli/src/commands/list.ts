import type { StashitClient, ListParams } from "@stashit/api-client";
import { formatBookmark, toJson } from "../format.js";

interface ListOptions extends ListParams {
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
}

export async function runList(opts: ListOptions): Promise<void> {
  const results = await opts.client.list({
    ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
    ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.tag ? { tag: opts.tag } : {}),
  });

  if (opts.json) {
    opts.print(toJson(results));
    return;
  }

  if (results.length === 0) {
    opts.print("No bookmarks found.");
    return;
  }

  results.forEach((b) => opts.print(formatBookmark(b)));
}
