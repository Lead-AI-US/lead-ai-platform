import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "api/**/*.test.ts", "cli/**/*.test.mjs"],
    exclude: ["src/**/*.rules.test.ts"],
  },
});
