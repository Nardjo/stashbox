import type { StashitClient, ListParams } from "@stashit/api-client";
import { formatBookmark, toJson } from "../format.js";

interface FailedOptions extends ListParams {
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
}

export async function runFailed(opts: FailedOptions): Promise<void> {
  const results = await opts.client.failed({
    ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
    ...(opts.offset !== undefined ? { offset: opts.offset } : {}),
  });

  if (opts.json) {
    opts.print(toJson(results));
    return;
  }

  if (results.length === 0) {
    opts.print("No failed bookmarks.");
    return;
  }

  results.forEach((b) => opts.print(formatBookmark(b)));
}
