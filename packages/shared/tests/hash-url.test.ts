import { describe, expect, it } from "vitest";

import { hashUrl } from "../src/hash-url.js";

describe("hashUrl", () => {
  it("returns 64-char lowercase hex", () => {
    const h = hashUrl("https://example.com/");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashUrl("https://example.com/x")).toBe(hashUrl("https://example.com/x"));
  });

  it("hashes the normalized URL — equivalent inputs collapse", () => {
    const a = hashUrl("https://www.Example.com/path/?utm_source=x#section");
    const b = hashUrl("http://example.com/path");
    expect(a).toBe(b);
  });

  it("differs for different URLs", () => {
    expect(hashUrl("https://example.com/a")).not.toBe(hashUrl("https://example.com/b"));
  });
});
