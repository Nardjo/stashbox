import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOptions, saveOptions } from "../src/lib/options.js";

const storageMock: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    sync: {
      get: vi.fn(async (keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) result[key] = storageMock[key];
        return result;
      }),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(storageMock, data);
      }),
    },
  },
});

beforeEach(() => {
  for (const key of Object.keys(storageMock)) delete storageMock[key];
  vi.clearAllMocks();
});

describe("getOptions", () => {
  it("returns empty strings when nothing is stored", async () => {
    const opts = await getOptions();
    expect(opts).toEqual({ apiUrl: "", apiKey: "" });
  });

  it("returns stored values", async () => {
    storageMock["apiUrl"] = "https://api.example.com";
    storageMock["apiKey"] = "sk-test";

    const opts = await getOptions();
    expect(opts).toEqual({ apiUrl: "https://api.example.com", apiKey: "sk-test" });
  });
});

describe("saveOptions", () => {
  it("persists apiUrl and apiKey to chrome.storage.sync", async () => {
    await saveOptions({ apiUrl: "https://api.example.com", apiKey: "sk-test" });

    expect(storageMock["apiUrl"]).toBe("https://api.example.com");
    expect(storageMock["apiKey"]).toBe("sk-test");
  });
});
