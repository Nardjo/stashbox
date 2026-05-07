import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm, mkdir } from "node:fs/promises";
import { loadConfig, setConfig, getConfig } from "../src/config.js";

const TEST_DIR = join(tmpdir(), `stashbox-config-test-${Date.now()}`);

describe("config", () => {
  beforeEach(() => mkdir(TEST_DIR, { recursive: true }));
  afterEach(() => rm(TEST_DIR, { recursive: true, force: true }));

  it("throws when config is missing", async () => {
    await expect(loadConfig(TEST_DIR)).rejects.toThrow("Missing config");
  });

  it("set and get a config value", async () => {
    await setConfig("apiUrl", "http://localhost:3333", TEST_DIR);
    const val = await getConfig("apiUrl", TEST_DIR);
    expect(val).toBe("http://localhost:3333");
  });

  it("loads full config after both keys are set", async () => {
    await setConfig("apiUrl", "http://localhost:3333", TEST_DIR);
    await setConfig("apiKey", "sk-test-123", TEST_DIR);
    const config = await loadConfig(TEST_DIR);
    expect(config.apiUrl).toBe("http://localhost:3333");
    expect(config.apiKey).toBe("sk-test-123");
  });
});
