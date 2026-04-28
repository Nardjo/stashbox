import { describe, expect, it, vi } from "vitest";
import type { Bookmark } from "@stashit/shared";
import { pollUntilDone } from "../src/lib/poll.js";

function makeBookmark(enrichmentStatus: Bookmark["enrichmentStatus"]): Bookmark {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    url: "https://example.com",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Example",
    description: "",
    tags: [],
    embedding: null,
    ogImage: null,
    embedData: null,
    enrichmentStatus,
    enrichmentError: null,
    enrichmentFailureReason: null,
    enrichmentAttempts: 1,
    enrichedAt: null,
    embeddingSourceText: null,
    savedAt: "2024-01-01T00:00:00.000Z",
    savedCount: 1,
    lastSavedAt: "2024-01-01T00:00:00.000Z",
    savedFrom: ["chrome-extension"],
  };
}

describe("pollUntilDone", () => {
  it("resolves with the bookmark when status becomes done", async () => {
    const fetchBookmark = vi
      .fn()
      .mockResolvedValueOnce(makeBookmark("pending"))
      .mockResolvedValueOnce(makeBookmark("enriching"))
      .mockResolvedValueOnce(makeBookmark("done"));

    const result = await pollUntilDone("bk_1", fetchBookmark, {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(result.enrichmentStatus).toBe("done");
    expect(fetchBookmark).toHaveBeenCalledTimes(3);
  });

  it("throws on timeout", async () => {
    const fetchBookmark = vi.fn().mockResolvedValue(makeBookmark("pending"));

    await expect(
      pollUntilDone("bk_1", fetchBookmark, {
        intervalMs: 10,
        timeoutMs: 50,
      }),
    ).rejects.toThrow("timeout");
  });

  it("stops early on failed", async () => {
    const fetchBookmark = vi
      .fn()
      .mockResolvedValueOnce(makeBookmark("pending"))
      .mockResolvedValueOnce(makeBookmark("failed"));

    const result = await pollUntilDone("bk_1", fetchBookmark, {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(result.enrichmentStatus).toBe("failed");
    expect(fetchBookmark).toHaveBeenCalledTimes(2);
  });
});
