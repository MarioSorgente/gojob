import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { getJob } from "./jobs";
import type { Job, JobCandidate } from "../types";

/**
 * The employer's saved candidates, across every job.
 *
 * "Save" was previously a dead end: it flagged the row and the candidate showed
 * up in one collapsed section of a single job page, with no way to review saves
 * across jobs and no way to undo. This backs the /employer/shortlist page.
 *
 * Queries filter on `businessId`, which is denormalized onto every shortlist row
 * — `ownerId` lives only on the job document, so filtering by it would mean
 * reading every job first.
 */

const shortlistGroup = () => adminDb().collectionGroup(COLLECTIONS.shortlist);

export interface SavedCandidate {
  entry: JobCandidate;
  job: Job;
}

function savedQuery(businessId: string) {
  return shortlistGroup()
    .where("businessId", "==", businessId)
    .where("employerAction", "==", "saved");
}

/**
 * Count of saved candidates, for the nav badge. A real aggregation — it never
 * transfers the documents.
 */
export async function countSavedForBusiness(businessId: string): Promise<number> {
  try {
    const snap = await savedQuery(businessId).count().get();
    return snap.data().count;
  } catch {
    // A missing composite index shouldn't take down every employer page for the
    // sake of a badge. Degrade to no badge and let the page itself surface it.
    return 0;
  }
}

/**
 * Saved candidates with their job, newest save first.
 *
 * Rows that have moved on are excluded so the shortlist stays a list of people
 * still awaiting a decision: once a candidate is matched or the pair was
 * rejected, the row belongs to the pipeline, not the shortlist.
 */
export async function listSavedForBusiness(
  businessId: string,
): Promise<SavedCandidate[]> {
  const snap = await savedQuery(businessId).get();

  const entries = snap.docs
    .map((d) => d.data() as JobCandidate)
    .filter((e) => !e.matchId && e.stage !== "rejected" && e.stage !== "hired");

  // One read per distinct job, not per row.
  const jobIds = [...new Set(entries.map((e) => e.jobId))];
  const jobs = new Map<string, Job>();
  await Promise.all(
    jobIds.map(async (id) => {
      const job = await getJob(id);
      if (job) jobs.set(id, job);
    }),
  );

  return entries
    .map((entry) => {
      const job = jobs.get(entry.jobId);
      return job ? { entry, job } : null;
    })
    .filter((x): x is SavedCandidate => x !== null)
    .sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
}
