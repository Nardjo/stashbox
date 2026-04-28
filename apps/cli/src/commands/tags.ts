import type { StashitClient } from "@stashit/api-client";
import { formatTag, toJson } from "../format.js";

interface TagsOptions {
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
  minCount?: number;
}

export async function runTags(opts: TagsOptions): Promise<void> {
  const results = await opts.client.tags(opts.minCount);

  if (opts.json) {
    opts.print(toJson(results));
    return;
  }

  if (results.length === 0) {
    opts.print("No tags found.");
    return;
  }

  results.forEach((t) => opts.print(formatTag(t)));
}
