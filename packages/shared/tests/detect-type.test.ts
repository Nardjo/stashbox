import { describe, expect, it } from "vitest";

import { detectType } from "../src/detect-type.js";

describe("detectType", () => {
  it.each([
    ["https://twitter.com/user/status/123", "tweet"],
    ["https://x.com/user/status/123", "tweet"],
    ["https://www.twitter.com/user", "tweet"],
  ])("detects tweet from %s", (url, expected) => {
    expect(detectType(url)).toBe(expected);
  });

  it.each([
    ["https://youtube.com/watch?v=abc", "youtube"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://m.youtube.com/watch?v=abc", "youtube"],
  ])("detects youtube from %s", (url, expected) => {
    expect(detectType(url)).toBe(expected);
  });

  it.each([
    ["https://example.com/paper.pdf", "pdf"],
    ["https://example.com/docs/guide.PDF", "pdf"],
    ["https://example.com/file.pdf?v=2", "pdf"],
  ])("detects pdf from %s", (url, expected) => {
    expect(detectType(url)).toBe(expected);
  });

  it.each([
    ["https://example.com/img.jpg", "image"],
    ["https://example.com/img.jpeg", "image"],
    ["https://example.com/img.png", "image"],
    ["https://example.com/img.gif", "image"],
    ["https://example.com/img.webp", "image"],
    ["https://example.com/img.avif", "image"],
    ["https://example.com/img.svg", "image"],
  ])("detects image from %s", (url, expected) => {
    expect(detectType(url)).toBe(expected);
  });

  it.each([
    "https://example.com/article",
    "https://blog.example.com/post-slug",
    "https://news.ycombinator.com/item?id=123",
  ])("falls back to other for %s", (url) => {
    expect(detectType(url)).toBe("other");
  });

  it("returns other for malformed URLs", () => {
    expect(detectType("not a url")).toBe("other");
  });
});
