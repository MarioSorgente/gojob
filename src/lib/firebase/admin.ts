/**
 * Firebase Admin SDK singleton (server-only, Node runtime).
 *
 * Lazily initialized: the app is created on first use (request time), never at
 * module load, so a missing/invalid credential surfaces as a runtime error on
 * the affected request instead of aborting the whole build.
 *
 * Credentials are resolved by ./credentials (FIREBASE_CLIENT_EMAIL +
 * FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT_KEY, or the emulator, or
 * application default credentials).
 */

import "server-only";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { adminAppOptions } from "./credentials";

let cachedApp: App | undefined;

/** Exported so callers needing the raw credential (e.g. the Admin REST API for
 *  index management) don't have to initialize a second app. */
export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApps()[0] : initializeApp(adminAppOptions());
  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}
