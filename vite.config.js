import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use the self-contained bundled version that has WASM inlined as base64.
      // This avoids Rollup's inability to bundle .wasm ESM imports in Vite 6.
      "argon2-browser": resolve(
        __dirname,
        "node_modules/argon2-browser/dist/argon2-bundled.min.js"
      ),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
