import { defineConfig, devices } from "@playwright/test";

/**
 * Pilot-journey acceptance test config. Requires the local stack already
 * running (Firestore + Auth emulators, scripts/local-api-server.mts, the
 * Vite dev server) — see docs/LOCAL_DEVELOPMENT.md. This does not start
 * those itself: the emulator needs a specific JDK and a specific env file
 * this config can't assume exists in every environment, and re-starting a
 * long-lived emulator per test run would defeat local iteration speed.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
