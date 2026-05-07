import type { Bookmark } from "@stashbox/shared";
import pc from "picocolors";

export function formatBookmark(b: Bookmark): string {
  const tags = b.tags.length ? pc.dim(`[${b.tags.join(", ")}]`) : "";
  const status = b.enrichmentStatus !== "done" ? pc.yellow(` (${b.enrichmentStatus})`) : "";
  return `${pc.bold(b.title || pc.italic("(no title)"))}${status}\n  ${pc.cyan(b.url)} ${tags}`;
}

export function formatTag(t: { tag: string; count: number }): string {
  return `${pc.bold(t.tag)} ${pc.dim(`(${t.count})`)}`;
}

export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
