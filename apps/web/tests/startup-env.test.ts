import { afterEach, describe, expect, it, vi } from "vitest";

describe("server startup env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses to load the server entry without Stashbox API env vars", async () => {
    vi.stubEnv("STASHBOX_API_URL", undefined);
    vi.stubEnv("STASHBOX_API_KEY", undefined);
    vi.resetModules();

    await expect(import("~/ssr.tsx")).rejects.toThrow(
      "Missing required env vars: STASHBOX_API_URL, STASHBOX_API_KEY",
    );
  });
});
