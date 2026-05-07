import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { TanStackStartVitePlugin } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [TanStackStartVitePlugin({ customViteReactPlugin: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },
});
