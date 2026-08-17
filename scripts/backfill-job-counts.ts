/** Rebuild durable per-job pipeline summaries from shortlist rows. */
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

async function main() {
  const app = buildApp();
  const projectId = app.options.projectId || "demo-gojob";
  if (PROD && projectId === "demo-gojob") {
    throw new Error("Refusing to migrate production without real credentials");
  }

  const db = getFirestore(app);
  let after: string | null = null;
  let rebuilt = 0;
  for (;;) {
    let query = db
      .collection(COLLECTIONS.jobs)
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (after) query = query.startAfter(after);
    const jobs = await query.get();
    if (jobs.empty) break;

    await Promise.all(
      jobs.docs.map(async (job) => {
        const shortlist = job.ref.collection(COLLECTIONS.shortlist);
        const [total, applications, matches] = await Promise.all([
          shortlist.count().get(),
          shortlist.where("candidateAction", "==", "applied").count().get(),
          shortlist
            .where("stage", "in", ["matched", "interview", "hired"])
            .count()
            .get(),
        ]);
        // Exact-value merge writes make retries and repeated runs idempotent.
        await job.ref.set(
          {
            shortlistCount: total.data().count,
            applicationCount: applications.data().count,
            matchCount: matches.data().count,
          },
          { merge: true },
        );
      }),
    );
    rebuilt += jobs.size;
    after = jobs.docs.at(-1)!.id;
  }
  console.log(`Rebuilt counts for ${rebuilt} jobs in ${projectId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
