import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeMatch } from "../matching";
import { jobMatchesFilters, type JobFilters } from "../search";
import {
  listCandidatesForRole,
  listAllCandidates,
  toCandidateSummary,
} from "./candidates";
import type { CandidateProfile, Job, JobCandidate, MatchBreakdown } from "../types";

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

export async function listLiveJobs(): Promise<Job[]> {
  const snap = await col().where("status", "==", "live").get();
  const jobs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }));
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
 */
export async function generateShortlist(job: Job): Promise<number> {
  const candidates = await listCandidatesForRole(job.role);

  const existingSnap = await shortlistCol(job.id).get();
  const existing = new Map<string, JobCandidate>(
    existingSnap.docs.map((d) => [d.id, d.data() as JobCandidate]),
  );

  const now = new Date().toISOString();
  const batch = adminDb().batch();

  for (const c of candidates) {
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
  return candidates.length;
}

/** Create a job (live) and immediately build its shortlist. */
export async function createAndPublishJob(
  input: NewJobInput,
): Promise<{ job: Job; matchCount: number }> {
  const job = await createJob({ ...input, status: "live" });
  const matchCount = await generateShortlist(job);
  return { job, matchCount };
}

export interface JobRecommendation {
  job: Job;
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
}

/** Rank all live jobs for a candidate (their "Recommended Jobs"). */
export async function recommendedJobsForCandidate(
  candidate: CandidateProfile,
): Promise<JobRecommendation[]> {
  const jobs = await listLiveJobs();
  return jobs
    .map((job) => ({ job, ...computeMatch(job, candidate) }))
    .sort((a, b) => b.score - a.score);
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

/** Score a single job against a candidate (job detail page). */
export async function scoreJobForCandidate(
  job: Job,
  candidate: CandidateProfile,
): Promise<JobRecommendation> {
  return { job, ...computeMatch(job, candidate) };
}

export { listAllCandidates };
