import { afterEach, describe, expect, it, vi } from "vitest";

import { themeInitScript } from "~/components/theme/theme.tsx";

describe("theme initialization", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.unstubAllGlobals();
  });

  it("applies the stored dark theme before React renders", () => {
    localStorage.setItem("stashbox-theme", "dark");

    Function(themeInitScript())();

    expect(document.documentElement).toHaveClass("dark");
  });

  it("removes a stale dark class when the stored theme is light", () => {
    localStorage.setItem("stashbox-theme", "light");
    document.documentElement.classList.add("dark");

    Function(themeInitScript())();

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("uses the OS dark preference before React renders when no theme is stored", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
    }));

    Function(themeInitScript())();

    expect(document.documentElement).toHaveClass("dark");
  });
});
