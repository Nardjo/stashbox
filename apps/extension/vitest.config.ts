import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@stashbox/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
      "@stashbox/api-client": new URL("../../packages/api-client/src/index.ts", import.meta.url)
        .pathname,
    },
  },
});
