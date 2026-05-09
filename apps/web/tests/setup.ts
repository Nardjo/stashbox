import "@testing-library/jest-dom/vitest";

if (
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage.clear !== "function"
) {
  const storage = new Map<string, string>();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return storage.size;
      },
      clear() {
        storage.clear();
      },
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      key(index: number) {
        return Array.from(storage.keys())[index] ?? null;
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    },
  });
}
