/** Rebuild durable per-user unread-message summaries from conversations. */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { adminAppOptions } from "../src/lib/firebase/credentials";
import { COLLECTIONS } from "../src/lib/collections";

config({ path: ".env.local" });

const PROD = process.argv.includes("--prod");
if (PROD) delete process.env.FIRESTORE_EMULATOR_HOST;
else process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080";

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

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

async function main() {
  const app = buildApp();
  const projectId = app.options.projectId || "demo-gojob";
  if (PROD && projectId === "demo-gojob") {
    throw new Error("Refusing to migrate production without real credentials");
  }

  const db = getFirestore(app);
  const totals = new Map<string, number>();
  let after: string | null = null;
  for (;;) {
    let query = db
      .collection(COLLECTIONS.conversations)
      .orderBy(FieldPath.documentId())
      .limit(400);
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) {
      const data = doc.data() as {
        participants?: unknown;
        unread?: Record<string, unknown>;
      };
      if (!Array.isArray(data.participants)) continue;
      for (const uid of data.participants) {
        if (typeof uid !== "string") continue;
        totals.set(uid, (totals.get(uid) ?? 0) + count(data.unread?.[uid]));
      }
    }
    after = snapshot.docs.at(-1)!.id;
  }

  // Include existing summaries so stale totals become zero. Exact-value writes
  // make rerunning this migration idempotent.
  const existing = await db.collection(COLLECTIONS.userStats).select().get();
  existing.docs.forEach((doc) => totals.set(doc.id, totals.get(doc.id) ?? 0));

  const entries = [...totals.entries()];
  for (let offset = 0; offset < entries.length; offset += 500) {
    const batch = db.batch();
    for (const [uid, unreadConversationMessages] of entries.slice(
      offset,
      offset + 500,
    )) {
      batch.set(
        db.collection(COLLECTIONS.userStats).doc(uid),
        { unreadConversationMessages },
        { merge: true },
      );
    }
    await batch.commit();
  }
  console.log(`Rebuilt ${entries.length} unread summaries in ${projectId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
