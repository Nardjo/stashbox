import type { Bookmark } from "@stashbox/shared";

const TERMINAL_STATUSES = new Set<Bookmark["enrichmentStatus"]>(["done", "degraded", "failed"]);

export async function pollUntilDone(
  id: string,
  fetchBookmark: (id: string) => Promise<Bookmark>,
  options: { intervalMs: number; timeoutMs: number },
): Promise<Bookmark> {
  const { intervalMs, timeoutMs } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const bookmark = await fetchBookmark(id);
    if (TERMINAL_STATUSES.has(bookmark.enrichmentStatus)) {
      return bookmark;
    }
    await sleep(intervalMs);
  }

  throw new Error("pollUntilDone: timeout");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
