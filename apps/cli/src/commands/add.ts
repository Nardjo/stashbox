import type { StashboxClient } from "@stashbox/api-client";
import pc from "picocolors";
import { formatBookmark, toJson } from "../format.js";

interface AddOptions {
  url: string;
  content?: string;
  json: boolean;
  client: StashboxClient;
  print: (line: string) => void;
}

export async function runAdd(opts: AddOptions): Promise<void> {
  const bookmark = await opts.client.add({
    url: opts.url,
    ...(opts.content ? { content: opts.content } : {}),
  });

  if (opts.json) {
    opts.print(toJson(bookmark));
    return;
  }

  opts.print(`${pc.green("✓")} Saved: ${formatBookmark(bookmark)}`);
}
