/**
 * Firebase client SDK — browser-safe. Uses the public Firebase Web config
 * (VITE_FIREBASE_*), which is not a secret: it identifies the project to
 * Firebase's client SDK, and access control is enforced by Firestore
 * Security Rules (see firebase/firestore.rules) and Firebase Auth, not by
 * hiding this config.
 *
 * Never import src/lib/firebase/admin.ts from anything that ends up in the
 * client bundle — it uses a private service account key.
 */
import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

function readClientConfig(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, appId };
}

const config = readClientConfig();

/** True only when all required VITE_FIREBASE_* variables are present. */
export const isFirebaseConfigured = config !== null;

const app = config
  ? getApps().length > 0
    ? getApps()[0]
    : initializeApp(config)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Emulator wiring — LOCAL DEV / TEST ONLY. Gated on import.meta.env.DEV
// (false in every production/preview build, since those are `vite build`
// output, not `vite dev`) so this cannot activate in a deployed environment
// even if VITE_USE_FIREBASE_EMULATOR were mistakenly left set. See
// docs/LOCAL_DEVELOPMENT.md for the full emulator + pilot-journey-test setup.
let emulatorsConnected = false;
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true" &&
  auth &&
  db &&
  !emulatorsConnected
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  emulatorsConnected = true;
  console.warn("[firebase/client] Connected to local Auth + Firestore emulators (dev-only).");
}
