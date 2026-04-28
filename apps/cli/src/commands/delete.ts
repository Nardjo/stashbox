import type { StashitClient } from "@stashit/api-client";
import pc from "picocolors";
import { toJson } from "../format.js";

interface DeleteOptions {
  id: string;
  json: boolean;
  client: StashitClient;
  print: (line: string) => void;
}

export async function runDelete(opts: DeleteOptions): Promise<void> {
  await opts.client.delete(opts.id);

  if (opts.json) {
    opts.print(toJson({ deleted: opts.id }));
    return;
  }

  opts.print(`${pc.green("✓")} Deleted bookmark ${opts.id}`);
}
