/**
 * Firebase Admin SDK — SERVER ONLY. Uses a private service account key
 * (FIREBASE_PRIVATE_KEY). Must only be imported from files under `api/`
 * (Vercel serverless functions), never from anything that ends up in the
 * Vite client bundle (src/pages, src/components, etc.).
 *
 * Fails safely: if the required env vars aren't set (local dev without
 * secrets, a preview deploy that hasn't been configured yet), getAdminApp()
 * returns null instead of throwing at import time. For local Firebase
 * emulators, a project id plus emulator hosts is enough. Callers must check
 * for null and return a 501/503, never fabricate data.
 */
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Checked via globalThis (not the bare `window` identifier) so this file
// type-checks under both the browser-lib app project and the DOM-less api
// project without redeclaring or depending on `window`'s ambient type.
if (typeof (globalThis as Record<string, unknown>).window !== "undefined") {
  throw new Error(
    "src/lib/firebase/admin.ts was imported into browser code. This module uses a " +
      "private service account key and must only run on the server (api/*.ts)."
  );
}

let cachedApp: App | null | undefined;

function readAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel/most env UIs store multi-line keys with literal "\n" - restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const usesFirebaseEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  if (projectId && usesFirebaseEmulator) return { projectId, clientEmail: null, privateKey: null };
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** Returns the singleton Admin app, or null if not configured. Never throws. */
export function getAdminApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;

  const config = readAdminConfig();
  if (!config) {
    cachedApp = null;
    return null;
  }

  cachedApp =
    getApps().length > 0
      ? getApps()[0]
      : config.clientEmail && config.privateKey
        ? initializeApp({ credential: cert(config) })
        : initializeApp({ projectId: config.projectId });
  return cachedApp;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}
