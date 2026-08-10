import { defineConfig } from "vitest/config";

/**
 * Separate config for Firestore security rules tests, which need the
 * Firestore emulator running and a longer timeout than unit tests. Run via
 * `npm run test:rules` (see docs/LOCAL_DEVELOPMENT.md for emulator setup).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.rules.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
