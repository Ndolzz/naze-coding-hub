import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Config test khusus komponen React (jsdom environment) — terpisah dari
 * vite.config.ts produksi supaya plugin PWA tidak ikut jalan saat test.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true
  }
});
