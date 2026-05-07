import type { StashboxClient } from "@stashbox/api-client";
import pc from "picocolors";
import { toJson } from "../format.js";

interface RefreshOptions {
  id: string;
  json: boolean;
  client: StashboxClient;
  print: (line: string) => void;
}

export async function runRefresh(opts: RefreshOptions): Promise<void> {
  const result = await opts.client.refresh(opts.id);

  if (opts.json) {
    opts.print(toJson(result));
    return;
  }

  opts.print(`${pc.green("✓")} Refresh queued for bookmark ${result.id}`);
}
