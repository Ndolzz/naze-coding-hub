import { defineConfig } from "vitest/config";

/**
 * Config test khusus untuk kode di api/ (Vercel Serverless Functions) —
 * terpisah dari test apps/client karena api/ bukan bagian dari npm
 * workspace client dan jalan di environment Node murni (bukan jsdom).
 */
export default defineConfig({
  test: {
    include: ["api/**/*.test.ts"],
    environment: "node"
  }
});
