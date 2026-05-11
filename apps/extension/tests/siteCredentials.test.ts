import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncCurrentSiteCredentials } from "../src/lib/siteCredentials.js";

const syncSiteCredentials = vi.fn();
const getAll = vi.fn();
const query = vi.fn();

vi.stubGlobal("chrome", {
  tabs: { query },
  cookies: { getAll },
});

describe("syncCurrentSiteCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("chrome", {
      tabs: { query },
      cookies: { getAll },
      runtime: { getManifest: () => ({ permissions: ["cookies"] }) },
    });
  });

  it("syncs active HTTP site cookies only when called", async () => {
    query.mockResolvedValue([{ url: "https://example.com/account?x=1" }]);
    getAll.mockResolvedValue([
      {
        name: "sid",
        value: "secret",
        domain: ".example.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        expirationDate: undefined,
        session: true,
        hostOnly: false,
      },
    ]);
    syncSiteCredentials.mockResolvedValue({
      id: "650e8400-e29b-41d4-a716-446655440000",
      domain: "example.com",
      cookieCount: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(syncSiteCredentials).not.toHaveBeenCalled();

    const result = await syncCurrentSiteCredentials({ syncSiteCredentials } as never);

    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(getAll).toHaveBeenCalledWith({ url: "https://example.com/" });
    expect(syncSiteCredentials).toHaveBeenCalledWith({
      domain: "example.com",
      cookies: [
        {
          name: "sid",
          value: "secret",
          domain: ".example.com",
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          expirationDate: null,
          session: true,
          hostOnly: false,
        },
      ],
    });
    expect(result.cookieCount).toBe(1);
  });

  it("rejects browser-internal pages", async () => {
    query.mockResolvedValue([{ url: "chrome://extensions" }]);

    await expect(syncCurrentSiteCredentials({ syncSiteCredentials } as never)).rejects.toThrow(
      "Site credentials require an HTTP or HTTPS page",
    );
    expect(getAll).not.toHaveBeenCalled();
    expect(syncSiteCredentials).not.toHaveBeenCalled();
  });

  it("explains when the cookies API is unavailable until extension reload", async () => {
    vi.stubGlobal("chrome", {
      tabs: { query },
      runtime: { getManifest: () => ({ permissions: ["cookies"] }) },
    });
    query.mockResolvedValue([{ url: "https://example.com/account" }]);

    await expect(syncCurrentSiteCredentials({ syncSiteCredentials } as never)).rejects.toThrow(
      "Rechargez l'extension depuis chrome://extensions",
    );
    expect(syncSiteCredentials).not.toHaveBeenCalled();
  });
});
