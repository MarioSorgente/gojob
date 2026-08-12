import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { chunk } from "../chunk";
import { computeMatch } from "../matching";
import { jobMatchesFilters, type JobFilters } from "../search";
import { PAGE_SIZE, paginateArray, type Page } from "../pagination";
import {
  listCandidatesForRole,
  listAllCandidates,
  toCandidateSummary,
} from "./candidates";
import type {
  CandidateProfile,
  Job,
  JobCandidate,
  MatchBreakdown,
  ShortlistStatus,
} from "../types";

const col = () => adminDb().collection(COLLECTIONS.jobs);
const shortlistCol = (jobId: string) =>
  col().doc(jobId).collection(COLLECTIONS.shortlist);

export type NewJobInput = Omit<Job, "id" | "createdAt" | "status"> &
  Partial<Pick<Job, "status">>;

export async function getJob(id: string): Promise<Job | null> {
  const snap = await col().doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() as Omit<Job, "id">) };
}

export async function listJobsByBusiness(businessId: string): Promise<Job[]> {
  const snap = await col().where("businessId", "==", businessId).get();
  const jobs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }));
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Newest live jobs, capped.
 *
 * Match scores are computed per candidate, so Firestore cannot rank these — the
 * ordering has to happen in memory, which means the candidate-facing feed reads
 * a window rather than a page. The cap bounds that read; ordering by createdAt
 * makes the window the freshest jobs rather than an arbitrary slice, and the
 * (status, createdAt) composite index serves it.
 *
 * Well clear of the marketplace's real size. If live jobs ever approach it, the
 * ranking needs to move to a search service that can sort by a stored score.
 */
export const MAX_RANKED_JOBS = 500;

export async function listLiveJobs(limit = MAX_RANKED_JOBS): Promise<Job[]> {
  const snap = await col()
    .where("status", "==", "live")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }));
}

export async function createJob(input: NewJobInput): Promise<Job> {
  const ref = col().doc();
  const job: Omit<Job, "id"> = {
    ...input,
    status: input.status ?? "live",
    createdAt: new Date().toISOString(),
  };
  await ref.set(job);
  return { id: ref.id, ...job };
}

/**
 * (Re)build a job's ranked shortlist by scoring every candidate whose desired
 * roles include the job's role. Preserves any employer/candidate actions and
 * pipeline stage already recorded for a pair. Returns the shortlist size.
 *
 * Writes are chunked: a single batch caps at 500 operations, so a popular role
 * matching more candidates than that used to throw and leave the job with no
 * shortlist at all. Marks the job `ready` (or `failed`) when it finishes, since
 * callers run this off the request and the UI can't otherwise distinguish
 * "still working" from "nobody matched".
 */
export async function generateShortlist(job: Job): Promise<number> {
  try {
    const candidates = await listCandidatesForRole(job.role);

    const existingSnap = await shortlistCol(job.id).get();
    const existing = new Map<string, JobCandidate>(
      existingSnap.docs.map((d) => [d.id, d.data() as JobCandidate]),
    );

    const now = new Date().toISOString();

    for (const group of chunk(candidates)) {
      const batch = adminDb().batch();
      for (const c of group) {
        const { score, breakdown, reasons } = computeMatch(job, c);
        const prev = existing.get(c.userId);
        const doc: JobCandidate = {
          jobId: job.id,
          candidateId: c.userId,
          businessId: job.businessId,
          score,
          breakdown,
          reasons,
          employerAction: prev?.employerAction ?? "none",
          candidateAction: prev?.candidateAction ?? "none",
          stage: prev?.stage ?? "recommended",
          matchId: prev?.matchId ?? null,
          conversationId: prev?.conversationId ?? null,
          candidateSummary: toCandidateSummary(c),
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        };
        batch.set(shortlistCol(job.id).doc(c.userId), doc);
      }
      await batch.commit();
    }

    await setShortlistStatus(job.id, "ready", candidates.length);
    return candidates.length;
  } catch (error) {
    // Leave a durable marker: without it a failure here is invisible, and the
    // employer just sees an empty shortlist forever.
    await setShortlistStatus(job.id, "failed").catch(() => {});
    throw error;
  }
}

async function setShortlistStatus(
  jobId: string,
  status: ShortlistStatus,
  count?: number,
): Promise<void> {
  await col()
    .doc(jobId)
    .set(
      {
        shortlistStatus: status,
        shortlistUpdatedAt: new Date().toISOString(),
        ...(count === undefined ? {} : { shortlistCount: count }),
      },
      { merge: true },
    );
}

/**
 * Create a live job without scoring the pool.
 *
 * Generation is the caller's job (see createJobAction, which hands it to
 * `after()`): it is unbounded work, and doing it inline made publishing a job
 * take as long as the candidate pool was large. The job is marked `pending` so
 * the UI can show progress rather than an empty list.
 */
export async function createAndPublishJob(
  input: NewJobInput,
): Promise<{ job: Job }> {
  const job = await createJob({
    ...input,
    status: "live",
    shortlistStatus: "pending",
  });
  return { job };
}

export interface JobRecommendation {
  job: Job;
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
}

/**
 * Candidate job search (scope §19): live jobs narrowed by filters, still ranked
 * by match score so the most relevant sit at the top.
 */
export async function searchJobsForCandidate(
  candidate: CandidateProfile,
  filters: JobFilters,
): Promise<JobRecommendation[]> {
  const jobs = await listLiveJobs();
  return jobs
    .filter((job) => jobMatchesFilters(job, filters))
    .map((job) => ({ job, ...computeMatch(job, candidate) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * One page of ranked recommendations.
 *
 * Ranking has to span the whole window before it can be sliced — the
 * best-matching job is rarely the newest — so this pages the ranked array
 * rather than the query. Reads stay bounded by MAX_RANKED_JOBS; only rendering
 * is paginated.
 */
export async function recommendedJobsPage(
  candidate: CandidateProfile,
  filters: JobFilters,
  cursor: string | null,
  pageSize = PAGE_SIZE,
): Promise<Page<JobRecommendation>> {
  const ranked = await searchJobsForCandidate(candidate, filters);
  return paginateArray(ranked, cursor, pageSize);
}

/** Score a single job against a candidate (job detail page). */
export async function scoreJobForCandidate(
  job: Job,
  candidate: CandidateProfile,
): Promise<JobRecommendation> {
  return { job, ...computeMatch(job, candidate) };
}

export { listAllCandidates };
