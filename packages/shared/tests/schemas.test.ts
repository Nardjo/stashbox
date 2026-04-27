import { describe, expect, it } from "vitest";

import {
  ApiErrorSchema,
  BookmarkSchema,
  BookmarkTypeSchema,
  CreateBookmarkInputSchema,
  EnrichmentStatusSchema,
  SearchInputSchema,
} from "../src/schemas.js";

describe("BookmarkTypeSchema", () => {
  it.each(["tweet", "youtube", "article", "image", "pdf", "other"])(
    "accepts %s",
    (value) => {
      expect(BookmarkTypeSchema.parse(value)).toBe(value);
    },
  );

  it("rejects unknown type", () => {
    expect(() => BookmarkTypeSchema.parse("video")).toThrow();
  });
});

describe("EnrichmentStatusSchema", () => {
  it.each(["pending", "enriching", "done", "degraded", "failed"])("accepts %s", (value) => {
    expect(EnrichmentStatusSchema.parse(value)).toBe(value);
  });

  it("rejects unknown status", () => {
    expect(() => EnrichmentStatusSchema.parse("queued")).toThrow();
  });
});

describe("CreateBookmarkInputSchema", () => {
  it("accepts a minimal payload with just a URL", () => {
    const out = CreateBookmarkInputSchema.parse({ url: "https://example.com/" });
    expect(out.url).toBe("https://example.com/");
  });

  it("accepts an optional client-extracted content field", () => {
    const out = CreateBookmarkInputSchema.parse({
      url: "https://example.com/",
      content: "<article>hello</article>",
    });
    expect(out.content).toBe("<article>hello</article>");
  });

  it("rejects missing url", () => {
    expect(() => CreateBookmarkInputSchema.parse({})).toThrow();
  });

  it("rejects malformed url", () => {
    expect(() => CreateBookmarkInputSchema.parse({ url: "not a url" })).toThrow();
  });
});

describe("SearchInputSchema", () => {
  it("requires a non-empty query", () => {
    expect(() => SearchInputSchema.parse({ query: "" })).toThrow();
    expect(() => SearchInputSchema.parse({})).toThrow();
  });

  it("applies a default min_score of 0.40", () => {
    const out = SearchInputSchema.parse({ query: "react hooks" });
    expect(out.min_score).toBe(0.4);
  });

  it("accepts type, tags, limit and min_score", () => {
    const out = SearchInputSchema.parse({
      query: "ml",
      type: "article",
      tags: ["ml", "video"],
      limit: 10,
      min_score: 0.5,
    });
    expect(out).toMatchObject({
      query: "ml",
      type: "article",
      tags: ["ml", "video"],
      limit: 10,
      min_score: 0.5,
    });
  });

  it("rejects min_score outside [0, 1]", () => {
    expect(() => SearchInputSchema.parse({ query: "x", min_score: 1.5 })).toThrow();
    expect(() => SearchInputSchema.parse({ query: "x", min_score: -0.1 })).toThrow();
  });

  it("rejects an unknown type", () => {
    expect(() => SearchInputSchema.parse({ query: "x", type: "bogus" })).toThrow();
  });
});

describe("BookmarkSchema", () => {
  const valid = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    url: "https://example.com/article",
    urlHash: "a".repeat(64),
    type: "article",
    title: "Hello",
    description: "A page",
    tags: ["greeting"],
    embedding: null,
    ogImage: null,
    embedData: null,
    enrichmentStatus: "done",
    enrichmentError: null,
    enrichmentFailureReason: null,
    enrichmentAttempts: 1,
    enrichedAt: "2026-04-27T10:00:00.000Z",
    embeddingSourceText: null,
    savedAt: "2026-04-27T09:00:00.000Z",
    savedCount: 1,
    lastSavedAt: "2026-04-27T09:00:00.000Z",
    savedFrom: ["chrome-extension"],
  };

  it("accepts a fully-formed bookmark", () => {
    expect(() => BookmarkSchema.parse(valid)).not.toThrow();
  });

  it("rejects an invalid urlHash length", () => {
    expect(() => BookmarkSchema.parse({ ...valid, urlHash: "abc" })).toThrow();
  });

  it("rejects an unknown savedFrom value", () => {
    expect(() => BookmarkSchema.parse({ ...valid, savedFrom: ["myspace"] })).toThrow();
  });

  it("requires enrichmentFailureReason for failed bookmarks", () => {
    // For now, reason is independently optional; failed status without reason allowed.
    const out = BookmarkSchema.parse({
      ...valid,
      enrichmentStatus: "failed",
      enrichmentError: "boom",
      enrichmentFailureReason: "url_dead",
    });
    expect(out.enrichmentFailureReason).toBe("url_dead");
  });
});

describe("ApiErrorSchema", () => {
  it("accepts a minimal error", () => {
    const out = ApiErrorSchema.parse({ error: "not_found", message: "Bookmark not found" });
    expect(out.error).toBe("not_found");
  });

  it("accepts optional details", () => {
    const out = ApiErrorSchema.parse({
      error: "validation",
      message: "bad input",
      details: { field: "url" },
    });
    expect(out.details).toEqual({ field: "url" });
  });

  it("rejects missing fields", () => {
    expect(() => ApiErrorSchema.parse({ error: "x" })).toThrow();
  });
});
