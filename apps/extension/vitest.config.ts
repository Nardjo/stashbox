import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@stashit/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
      "@stashit/api-client": new URL("../../packages/api-client/src/index.ts", import.meta.url)
        .pathname,
    },
  },
});
