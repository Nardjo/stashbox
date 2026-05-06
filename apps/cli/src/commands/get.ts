import type { StashboxClient } from "@stashbox/api-client";
import { formatBookmark, toJson } from "../format.js";

interface GetOptions {
  id: string;
  json: boolean;
  client: StashboxClient;
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
