/** Backfill Conversation.activityAt before deploying its ordered query/index. */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { adminAppOptions } from "../src/lib/firebase/credentials";
import { COLLECTIONS } from "../src/lib/collections";

config({ path: ".env.local" });

const PROD = process.argv.includes("--prod");
if (PROD) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
} else {
  process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080";
}

function buildApp(): App {
  if (getApps().length) return getApps()[0];
  if (PROD) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath && existsSync(keyPath)) {
      const key = JSON.parse(readFileSync(keyPath, "utf8")) as {
        project_id?: string;
      };
      return initializeApp({
        credential: cert(keyPath),
        projectId: key.project_id,
      });
    }
  }
  return initializeApp(adminAppOptions());
}

async function main() {
  const app = buildApp();
  const projectId = app.options.projectId || "demo-gojob";
  if (PROD && projectId === "demo-gojob") {
    throw new Error("Refusing to migrate production without real credentials");
  }

  const db = getFirestore(app);
  const conversations = db.collection(COLLECTIONS.conversations);
  let after: string | null = null;
  let updated = 0;

  for (;;) {
    let query = conversations.orderBy(FieldPath.documentId()).limit(400);
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writes = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data() as {
        activityAt?: unknown;
        lastMessageAt?: unknown;
        createdAt?: unknown;
      };
      if (typeof data.activityAt === "string") continue;
      const activityAt =
        typeof data.lastMessageAt === "string"
          ? data.lastMessageAt
          : data.createdAt;
      if (typeof activityAt !== "string") {
        throw new Error(
          `Conversation ${doc.id} has no usable activity timestamp`,
        );
      }
      batch.update(doc.ref, { activityAt });
      writes++;
    }
    if (writes) {
      await batch.commit();
      updated += writes;
    }
    after = snapshot.docs.at(-1)!.id;
  }

  console.log(`Backfilled ${updated} conversations in ${projectId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
