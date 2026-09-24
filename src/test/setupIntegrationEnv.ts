/**
 * Loads .env.local into process.env before integration tests run, so
 * getAdminDb()/getAdminAuth() resolve to real (fake-credentialed, real
 * Admin SDK) clients pointed at the local emulators via
 * FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST. Same tiny
 * loader as scripts/local-api-server.mts — local dev/test only, never
 * used for staging or production.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
