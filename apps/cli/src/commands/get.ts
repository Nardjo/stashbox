import type { StashitClient } from "@stashit/api-client";
import { formatBookmark, toJson } from "../format.js";

interface GetOptions {
  id: string;
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
}

export async function runGet(opts: GetOptions): Promise<void> {
  const bookmark = await opts.client.get(opts.id);

  if (opts.json) {
    opts.print(toJson(bookmark));
    return;
  }

  opts.print(formatBookmark(bookmark));
}
