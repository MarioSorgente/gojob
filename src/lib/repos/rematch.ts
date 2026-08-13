import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { chunk } from "../chunk";
import { withIndexFallback } from "../firestoreErrors";
import { computeMatch } from "../matching";
import { candidateEntries } from "./pipeline";
import { toCandidateSummary } from "./candidates";
import type { CandidateProfile, Job, JobCandidate } from "../types";

/**
 * Keeping shortlists current as candidate data changes.
 *
 * Shortlists were previously built once, when a job was published. A candidate
 * who signed up or updated their profile afterwards never appeared for existing
 * jobs — so the pool an employer saw was frozen at publish time and quietly
 * went stale.
 *
 * This runs the same scoring in the other direction: given one candidate, fix
 * up their row on every live job they're eligible for.
 */

const jobsCol = () => adminDb().collection(COLLECTIONS.jobs);
const shortlistDoc = (jobId: string, candidateId: string) =>
  jobsCol().doc(jobId).collection(COLLECTIONS.shortlist).doc(candidateId);

/** Firestore caps an `in` filter at 30 values. */
const MAX_IN_VALUES = 30;

export interface ResyncResult {
  upserted: number;
  removed: number;
}

/** Live jobs asking for any of `roles`. */
async function liveJobsForRoles(roles: string[]): Promise<Job[]> {
  const wanted = [...new Set(roles.filter(Boolean))].slice(0, MAX_IN_VALUES);
  if (wanted.length === 0) return [];

  const toJobs = (snap: FirebaseFirestore.QuerySnapshot) =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }));

  return withIndexFallback(
    "liveJobsForRoles",
    async () =>
      toJobs(
        await jobsCol().where("status", "==", "live").where("role", "in", wanted).get(),
      ),
    // status + role needs a composite index; a single equality does not.
    async () => {
      const lower = new Set(wanted.map((r) => r.toLowerCase()));
      return toJobs(await jobsCol().where("status", "==", "live").get()).filter((j) =>
        lower.has(j.role.toLowerCase()),
      );
    },
  );
}

/**
 * Re-score one candidate across every live job matching their desired roles,
 * and tidy up rows for jobs they're no longer eligible for.
 *
 * Removal is deliberately conservative: a row is only deleted when it is still
 * untouched (`recommended`, no action from either side). Once anyone has
 * applied, invited, matched or hired, the row is pipeline history and dropping
 * it would destroy a live conversation — so a candidate who removes a role
 * keeps any relationship already underway.
 */
export async function resyncCandidateShortlists(
  candidate: CandidateProfile,
): Promise<ResyncResult> {
  const jobs = await liveJobsForRoles(candidate.roles);
  const eligible = new Set(jobs.map((j) => j.id));
  const now = new Date().toISOString();
  const summary = toCandidateSummary(candidate);

  // Every existing row for this candidate, so we can spot the stale ones.
  // Shared with the pipeline so both get the same index fallback.
  const existing = new Map(
    (await candidateEntries(candidate.userId)).map((e) => [e.jobId, e]),
  );

  let upserted = 0;
  for (const group of chunk(jobs)) {
    const batch = adminDb().batch();
    for (const job of group) {
      const { score, breakdown, reasons } = computeMatch(job, candidate);
      const prev = existing.get(job.id);
      const doc: JobCandidate = {
        jobId: job.id,
        candidateId: candidate.userId,
        businessId: job.businessId,
        score,
        breakdown,
        reasons,
        // Preserve pipeline state; only the scoring and the denormalized
        // summary are refreshed.
        employerAction: prev?.employerAction ?? "none",
        candidateAction: prev?.candidateAction ?? "none",
        stage: prev?.stage ?? "recommended",
        matchId: prev?.matchId ?? null,
        conversationId: prev?.conversationId ?? null,
        candidateSummary: summary,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
      };
      batch.set(shortlistDoc(job.id, candidate.userId), doc);
      upserted++;
    }
    await batch.commit();
  }

  const stale = [...existing.values()].filter(
    (entry) =>
      !eligible.has(entry.jobId) &&
      entry.employerAction === "none" &&
      entry.candidateAction === "none" &&
      entry.stage === "recommended",
  );

  let removed = 0;
  for (const group of chunk(stale)) {
    const batch = adminDb().batch();
    for (const entry of group) {
      batch.delete(shortlistDoc(entry.jobId, candidate.userId));
      removed++;
    }
    await batch.commit();
  }

  return { upserted, removed };
}

/**
 * Fire-and-forget wrapper for server actions.
 *
 * Re-scoring must never take down the write that triggered it: a candidate
 * saving their profile should not see an error because a shortlist refresh
 * failed. Pass this to `after()` so it runs off the response.
 */
export async function resyncCandidateShortlistsQuietly(
  candidate: CandidateProfile,
): Promise<void> {
  try {
    await resyncCandidateShortlists(candidate);
  } catch (error) {
    console.error(
      `Shortlist resync failed for candidate ${candidate.userId}`,
      error,
    );
  }
}
