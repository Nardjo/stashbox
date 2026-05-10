import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "~/components/ui/button.tsx";

type Theme = "light" | "dark";

const storageKey = "stashbox-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    setTheme(preferredTheme);
    applyTheme(preferredTheme);
  }, []);

  const selectTheme = useCallback((nextTheme: Theme) => {
    setTheme(nextTheme);
    persistTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme: selectTheme }), [selectTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
  }

  return (
    <Button
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      onClick={toggleTheme}
      type="button"
      variant="outline"
      className="h-8 px-3 text-[0.68rem]"
    >
      {isDark ? "Clair" : "Sombre"}
    </Button>
  );
}

function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeToggle must be rendered inside ThemeProvider");
  return value;
}

export function themeInitScript() {
  return `(() => {
  try {
    const key = ${JSON.stringify(storageKey)};
    const stored = localStorage.getItem(key);
    const theme = stored === "light" || stored === "dark"
      ? stored
      : (matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();`;
}

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = readStoredTheme();
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // The visible theme still changes when storage is unavailable.
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
