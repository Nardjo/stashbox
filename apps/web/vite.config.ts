import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackStartVitePlugin } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [TanStackStartVitePlugin({ customViteReactPlugin: true }), react(), tailwindcss()],
});
