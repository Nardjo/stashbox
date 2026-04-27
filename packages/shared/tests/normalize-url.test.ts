import { describe, expect, it } from "vitest";

import { normalizeUrl } from "../src/normalize-url.js";

describe("normalizeUrl", () => {
  it("lowercases host and strips fragment", () => {
    expect(normalizeUrl("https://Example.COM/path#section")).toBe("https://example.com/path");
  });

  it("forces https when scheme is http", () => {
    expect(normalizeUrl("http://example.com/path")).toBe("https://example.com/path");
  });

  it.each([
    ["https://www.example.com/", "https://example.com/"],
    ["https://m.example.com/", "https://example.com/"],
    ["https://mobile.example.com/", "https://example.com/"],
  ])("strips host prefix: %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("rewrites twitter.com to x.com", () => {
    expect(normalizeUrl("https://twitter.com/user/status/123")).toBe(
      "https://x.com/user/status/123",
    );
  });

  it("rewrites youtu.be/<id> to youtube.com/watch?v=<id>", () => {
    expect(normalizeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it.each([
    ["https://example.com/blog/", "https://example.com/blog"],
    ["https://example.com/", "https://example.com/"],
    ["https://example.com/index.html", "https://example.com/"],
    ["https://example.com/section/index.php", "https://example.com/section"],
    ["https://example.com/section/index.htm", "https://example.com/section"],
  ])("normalizes path: %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("preserves path case sensitivity", () => {
    expect(normalizeUrl("https://example.com/MyPath/Sub")).toBe("https://example.com/MyPath/Sub");
  });

  it.each([
    ["http://example.com:80/", "https://example.com/"],
    ["https://example.com:443/", "https://example.com/"],
    ["https://example.com:8080/", "https://example.com:8080/"],
  ])("strips default ports: %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it.each([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "msclkid",
    "mc_eid",
    "mc_cid",
    "igshid",
    "_ga",
    "ref",
    "ref_src",
    "ref_url",
    "yclid",
    "dclid",
    "twclid",
    "mkt_tok",
    "_hsenc",
    "_hsmi",
    "vero_id",
  ])("strips tracking param: %s", (param) => {
    expect(normalizeUrl(`https://example.com/?${param}=abc`)).toBe("https://example.com/");
  });

  it("preserves non-tracking params", () => {
    expect(normalizeUrl("https://example.com/?q=hello&page=2")).toBe(
      "https://example.com/?page=2&q=hello",
    );
  });

  it("sorts remaining params alphabetically", () => {
    expect(normalizeUrl("https://example.com/?z=1&a=2&m=3")).toBe(
      "https://example.com/?a=2&m=3&z=1",
    );
  });

  it("strips trackers while preserving and sorting the rest", () => {
    expect(
      normalizeUrl("https://example.com/article?utm_source=newsletter&id=42&fbclid=xyz&q=react"),
    ).toBe("https://example.com/article?id=42&q=react");
  });

  it("strips a regular fragment", () => {
    expect(normalizeUrl("https://example.com/page#footer")).toBe("https://example.com/page");
  });

  it("preserves SPA fragment route (starts with /)", () => {
    expect(normalizeUrl("https://app.example.com/#/dashboard/123")).toBe(
      "https://app.example.com/#/dashboard/123",
    );
  });
});
