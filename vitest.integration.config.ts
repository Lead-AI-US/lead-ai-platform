import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Server-logic integration tests that need the Firestore/Auth emulator
 * running (real Admin SDK, real writes/reads/transactions — not mocked).
 * Separate from unit tests (npm test, which mock the write layer and so
 * can't catch the class of bug these exist for) and from Firestore
 * security-rules tests (npm run test:rules, which test firestore.rules
 * itself via the client SDK). Run via `npm run test:integration` — see
 * docs/LOCAL_DEVELOPMENT.md for emulator setup.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/setupIntegrationEnv.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Firestore transactions and shared collections make these order-
    // and isolation-sensitive across files; run them one at a time.
    fileParallelism: false,
  },
});
