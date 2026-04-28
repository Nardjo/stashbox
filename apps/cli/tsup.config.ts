import { defineConfig } from "tsup";

const isWatch = process.argv.includes("--watch");

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  target: "node22",
  noExternal: isWatch ? [] : [/.*/],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
