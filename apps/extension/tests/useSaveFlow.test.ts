import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bookmark } from "@stashit/shared";
import { useSaveFlow } from "../src/hooks/useSaveFlow.js";

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    url: "https://example.com",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Example Article",
    description: "A description",
    tags: ["tech", "ai"],
    embedding: null,
    ogImage: null,
    embedData: null,
    enrichmentStatus: "done",
    enrichmentError: null,
    enrichmentFailureReason: null,
    enrichmentAttempts: 1,
    enrichedAt: "2024-01-01T00:00:00.000Z",
    embeddingSourceText: null,
    savedAt: "2024-01-01T00:00:00.000Z",
    savedCount: 1,
    lastSavedAt: "2024-01-01T00:00:00.000Z",
    savedFrom: ["chrome-extension"],
    ...overrides,
  };
}

const mockSave = vi.fn<() => Promise<Bookmark>>();
const mockPoll = vi.fn<(id: string) => Promise<Bookmark>>();

describe("useSaveFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useSaveFlow({ save: mockSave, poll: mockPoll }));
    expect(result.current.state).toBe("idle");
    expect(result.current.bookmark).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions through saving -> saved -> done", async () => {
    const bookmark = makeBookmark();
    mockSave.mockResolvedValueOnce(bookmark);
    mockPoll.mockResolvedValueOnce(bookmark);

    const { result } = renderHook(() => useSaveFlow({ save: mockSave, poll: mockPoll }));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.state).toBe("saved");
    expect(result.current.bookmark).toEqual(bookmark);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockPoll).toHaveBeenCalledWith(bookmark.id);
  });

  it("handles 409 conflict as already-saved", async () => {
    const bookmark = makeBookmark();
    const conflict = Object.assign(new Error("Already saved"), {
      status: 409 as const,
      bookmark,
    });
    mockSave.mockRejectedValueOnce(conflict);

    const { result } = renderHook(() => useSaveFlow({ save: mockSave, poll: mockPoll }));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.state).toBe("already-saved");
    expect(result.current.bookmark).toEqual(bookmark);
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it("handles generic errors", async () => {
    mockSave.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSaveFlow({ save: mockSave, poll: mockPoll }));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.state).toBe("failed");
    expect(result.current.error).toBe("Network error");
    expect(mockPoll).not.toHaveBeenCalled();
  });
});
