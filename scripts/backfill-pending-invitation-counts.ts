/** Rebuild durable per-candidate pending-invitation summaries from shortlist rows. */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

async function main() {
  const app = buildApp();
  const projectId = app.options.projectId || "demo-gojob";
  if (PROD && projectId === "demo-gojob") {
    throw new Error("Refusing to migrate production without real credentials");
  }

  const db = getFirestore(app);
  const totals = new Map<string, number>();
  // Count candidates in bounded groups. This uses the same indexed query as
  // the page while aggregation avoids reading every matching shortlist row.
  const [candidates, existing] = await Promise.all([
    db.collection(COLLECTIONS.candidates).select().get(),
    db.collection(COLLECTIONS.userStats).select().get(),
  ]);
  for (let offset = 0; offset < candidates.docs.length; offset += 100) {
    await Promise.all(
      candidates.docs.slice(offset, offset + 100).map(async (candidate) => {
        const result = await db
          .collectionGroup(COLLECTIONS.shortlist)
          .where("candidateId", "==", candidate.id)
          .where("employerAction", "==", "invited")
          .where("candidateAction", "==", "none")
          .count()
          .get();
        totals.set(candidate.id, result.data().count);
      }),
    );
  }
  // Include existing summaries so deleted/legacy candidates become zero too.
  existing.docs.forEach((doc) => totals.set(doc.id, totals.get(doc.id) ?? 0));

  const entries = [...totals.entries()];
  for (let offset = 0; offset < entries.length; offset += 500) {
    const batch = db.batch();
    for (const [candidateId, pendingInvitationCount] of entries.slice(
      offset,
      offset + 500,
    )) {
      batch.set(
        db.collection(COLLECTIONS.userStats).doc(candidateId),
        { pendingInvitationCount },
        { merge: true },
      );
    }
    await batch.commit();
  }
  console.log(
    `Rebuilt ${entries.length} invitation summaries in ${projectId}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
