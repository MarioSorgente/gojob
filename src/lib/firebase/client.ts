/**
 * Firebase client SDK (browser).
 *
 * Lazily initialized: `getAuth`/`getFirestore`/`getStorage` are only called on
 * first use (which happens in the browser), never at module load. This keeps the
 * build from ever failing while prerendering pages that import this module — a
 * missing/invalid config surfaces as a runtime auth error, not a build abort.
 *
 * Auto-connects to the local Emulator Suite when
 * NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let cached: { auth: Auth; db: Firestore; storage: FirebaseStorage } | undefined;

function initClient() {
  if (cached) return cached;

  const app = firebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1"
  ) {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost";
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }

  cached = { auth, db, storage };
  return cached;
}

export const getClientAuth = (): Auth => initClient().auth;
export const getClientDb = (): Firestore => initClient().db;
export const getClientStorage = (): FirebaseStorage => initClient().storage;
