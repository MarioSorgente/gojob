/**
 * Firebase Admin SDK singleton (server-only, Node runtime).
 *
 * In development the presence of FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
 * makes the Admin SDK talk to the emulators automatically — no service account
 * needed. In production, provide FIREBASE_SERVICE_ACCOUNT_KEY (base64 or raw
 * JSON) or GOOGLE_APPLICATION_CREDENTIALS.
 */

import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(text) as ServiceAccount;
}

function createAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "demo-gojob";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const usingEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1";
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // Emulator / demo mode: no credentials required.
  if (usingEmulator && !svc) {
    return initializeApp({ projectId, storageBucket });
  }

  if (svc) {
    return initializeApp({
      credential: cert(parseServiceAccount(svc)),
      projectId,
      storageBucket,
    });
  }

  // Fall back to application default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS).
  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket,
  });
}

const adminApp = createAdminApp();

export function adminAuth(): Auth {
  return getAuth(adminApp);
}

export function adminDb(): Firestore {
  return getFirestore(adminApp);
}

export function adminStorage(): Storage {
  return getStorage(adminApp);
}
