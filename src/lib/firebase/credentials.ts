/**
 * Resolve Firebase Admin credentials from the environment.
 *
 * Supports (in priority order):
 *   1. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ FIREBASE_PROJECT_ID)
 *      — the recommended, most reliable way on Vercel.
 *   2. FIREBASE_SERVICE_ACCOUNT_KEY — the full service-account JSON, either raw
 *      or base64-encoded.
 *   3. Emulator mode — no credentials needed.
 *   4. Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS).
 *
 * No "server-only" import here so scripts (e.g. seeding) can reuse it.
 */

import {
  applicationDefault,
  cert,
  type AppOptions,
  type ServiceAccount,
} from "firebase-admin/app";

/** Turn a pasted private key (with literal \n or wrapping quotes) into a real PEM. */
export function normalizePrivateKey(key: string): string {
  let k = key.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
}

function parseServiceAccountBlob(raw: string): ServiceAccount {
  let text = raw.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  if (!text.startsWith("{")) {
    // Assume base64-encoded JSON.
    text = Buffer.from(text, "base64").toString("utf8");
  }
  text = text.replace(/^﻿/, "").trim();

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON. " +
        "Recommended fix: instead set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL " +
        "and FIREBASE_PRIVATE_KEY (three separate variables).",
    );
  }
  if (typeof obj.private_key === "string") {
    obj.private_key = normalizePrivateKey(obj.private_key);
  }
  return obj as ServiceAccount;
}

export function projectIdFromEnv(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "demo-gojob"
  );
}

export function isEmulator(): boolean {
  return (
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1"
  );
}

/** Build the options object for firebase-admin initializeApp(). */
export function adminAppOptions(): AppOptions {
  const projectId = projectIdFromEnv();
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (clientEmail && privateKey) {
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
      }),
      projectId,
      storageBucket,
    };
  }

  if (svc && svc.trim()) {
    return { credential: cert(parseServiceAccountBlob(svc)), projectId, storageBucket };
  }

  if (isEmulator()) {
    return { projectId, storageBucket };
  }

  return { credential: applicationDefault(), projectId, storageBucket };
}
