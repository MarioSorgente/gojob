/**
 * Seed demo data from the command line (scope §31).
 *
 * Emulator (default):
 *   npm run emulators           # in one terminal
 *   npm run seed                # in another
 *
 * Real Firebase project:
 *   npm run seed:prod           # needs real credentials, see below
 *
 * There is also a no-terminal path: set ENABLE_DEMO_TOOLS=1 and DEMO_SEED_TOKEN
 * in the hosting environment and use /setup in the browser. Both routes call the
 * same runSeed() in src/lib/demo/seed.ts.
 *
 * Demo logins (password: demo1234)
 *   employer:  owner@milkandmadu.demo
 *   candidate: ayu@gojob.demo
 *   admin:     admin@gojob.demo
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminAppOptions } from "../src/lib/firebase/credentials";
import { runSeed } from "../src/lib/demo/seed";

config({ path: ".env.local" });

/** `--prod` seeds the real Firebase project; default seeds the local emulator. */
const PROD = process.argv.includes("--prod");

if (PROD) {
  // Target the real project: strip any emulator routing from the env.
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "0";
} else {
  // Default: local emulator, no credentials required.
  process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "localhost:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "localhost:9199";
}

function buildApp(): App {
  if (getApps().length) return getApps()[0];
  if (PROD) {
    // Simplest path: GOOGLE_APPLICATION_CREDENTIALS points at the downloaded
    // serviceAccount.json. cert() reads the file; project id comes from it.
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath && existsSync(keyPath)) {
      const raw = JSON.parse(readFileSync(keyPath, "utf8")) as { project_id?: string };
      return initializeApp({ credential: cert(keyPath), projectId: raw.project_id });
    }
    return initializeApp(adminAppOptions());
  }
  return initializeApp(adminAppOptions());
}

const app = buildApp();
const PROJECT_ID = app.options.projectId || "demo-gojob";

if (PROD && PROJECT_ID === "demo-gojob") {
  console.error(
    "Refusing to seed: no real credentials found.\n" +
      "Point GOOGLE_APPLICATION_CREDENTIALS at your serviceAccount.json (or set the\n" +
      "FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY vars) in .env.local, then retry.",
  );
  process.exit(1);
}

async function main() {
  console.log(`Seeding project "${PROJECT_ID}" (${PROD ? "PRODUCTION" : "emulator"})…`);

  const result = await runSeed(
    { db: getFirestore(app), auth: getAuth(app) },
    PROJECT_ID,
  );

  console.log(
    `✓ ${result.candidates} candidates, ${result.businesses} businesses, ${result.jobs.length} jobs.`,
  );
  for (const job of result.jobs) {
    console.log(`   ${job.role} (${job.status}) — ${job.shortlisted} shortlisted`);
  }
  console.log("\nDemo logins (password: demo1234):");
  for (const login of result.logins) {
    console.log(`  ${login.role.padEnd(10)} ${login.email}`);
  }
  console.log("\nAdmin panel: /admin");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
