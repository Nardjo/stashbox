import { describe, it, expect } from "vitest";
import { parseEnv } from "/Users/jordanbastin/Developer/stashbox/apps/web/src/env.ts";

describe("env validation", () => {
  it("throws when STASHBOX_API_URL is missing", () => {
    expect(() => parseEnv({ STASHBOX_API_KEY: "test-key" })).toThrow();
  });

  it("throws when STASHBOX_API_KEY is missing", () => {
    expect(() => parseEnv({ STASHBOX_API_URL: "http://localhost:3337" })).toThrow();
  });

  it("throws when both vars are missing", () => {
    expect(() => parseEnv({})).toThrow();
  });

  it("returns validated env when both vars are present", () => {
    const env = parseEnv({
      STASHBOX_API_URL: "http://localhost:3337",
      STASHBOX_API_KEY: "test-key",
    });
    expect(env.STASHBOX_API_URL).toBe("http://localhost:3337");
    expect(env.STASHBOX_API_KEY).toBe("test-key");
  });
});
