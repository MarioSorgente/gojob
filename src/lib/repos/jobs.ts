import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { chunk } from "../chunk";
import { withIndexFallback } from "../firestoreErrors";
import { computeMatch } from "../matching";
import { jobMatchesFilters, type JobFilters } from "../search";
import {
  PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  type Page,
} from "../pagination";
import { enqueueJobRecommendations } from "../recommendationTasks";
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
  JobRecommendationProjection,
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
  const jobs = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Job, "id">),
  }));
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
  const toJobs = (snap: FirebaseFirestore.QuerySnapshot) =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }));

  return withIndexFallback(
    "listLiveJobs",
    async () =>
      toJobs(
        await col()
          .where("status", "==", "live")
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get(),
      ),
    // Ordering by createdAt alongside the status filter needs a composite
    // index. Without it, fetch and sort in memory — the same shape this had
    // before pagination, so it is known to work; just unbounded.
    async () =>
      toJobs(await col().where("status", "==", "live").get())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
  );
}

export async function createJob(input: NewJobInput): Promise<Job> {
  const ref = col().doc();
  const job: Omit<Job, "id"> = {
    ...input,
    status: input.status ?? "live",
    createdAt: new Date().toISOString(),
    shortlistCount: input.shortlistCount ?? 0,
    applicationCount: input.applicationCount ?? 0,
    matchCount: input.matchCount ?? 0,
  };
  await ref.set(job);
  if (job.status === "live") await enqueueJobRecommendations(ref.id);
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
 * createJob durably enqueues generation: it is unbounded work, and doing it
 * inline made publishing take as long as the candidate pool was large. The job
 * is marked `pending` so the UI can show progress rather than an empty list.
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

interface RecommendationCursor {
  v: 1;
  mode: "projection";
  score: number;
  jobId: string;
}

interface WindowCursor {
  v: 1;
  mode: "window";
  windowId: string;
  offset: number;
}

interface WindowEntry {
  jobId: string;
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
}

interface RecommendationWindow {
  candidateId: string;
  filterHash: string;
  expiresAt: string;
  entries: WindowEntry[];
}

const filterHash = (filters: JobFilters) =>
  createHash("sha256").update(JSON.stringify(filters)).digest("hex");

async function hydrateRecommendations(entries: WindowEntry[]) {
  if (!entries.length) return [];
  const refs = entries.map((entry) => col().doc(entry.jobId));
  const docs = await adminDb().getAll(...refs);
  const jobs = new Map(
    docs
      .filter((doc) => doc.exists)
      .map((doc) => [
        doc.id,
        { id: doc.id, ...(doc.data() as Omit<Job, "id">) },
      ]),
  );
  return entries.flatMap((entry) => {
    const job = jobs.get(entry.jobId);
    return job?.status === "live" ? [{ job, ...entry }] : [];
  });
}

async function fallbackRecommendationsPage(
  candidate: CandidateProfile,
  filters: JobFilters,
  cursor: WindowCursor | null,
  pageSize: number,
): Promise<Page<JobRecommendation>> {
  const windows = adminDb().collection(COLLECTIONS.recommendationWindows);
  let windowId = cursor?.windowId;
  let offset = cursor?.offset ?? 0;
  let window: RecommendationWindow | undefined;
  if (windowId) {
    const snap = await windows.doc(windowId).get();
    window = snap.data() as RecommendationWindow | undefined;
    if (
      window?.candidateId !== candidate.userId ||
      window.filterHash !== filterHash(filters) ||
      Date.parse(window.expiresAt) <= Date.now()
    ) {
      window = undefined;
      windowId = undefined;
      offset = 0;
    }
  }
  if (!window) {
    const ranked = await searchJobsForCandidate(candidate, filters);
    windowId = randomUUID();
    window = {
      candidateId: candidate.userId,
      filterHash: filterHash(filters),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      entries: ranked.map(({ job, ...match }) => ({ jobId: job.id, ...match })),
    };
    await windows.doc(windowId).set(window);
  }
  const entries = window.entries.slice(offset, offset + pageSize);
  const items = await hydrateRecommendations(entries);
  const next = offset + entries.length;
  return {
    items,
    nextCursor:
      next < window.entries.length
        ? encodeCursor<WindowCursor>({
            v: 1,
            mode: "window",
            windowId: windowId!,
            offset: next,
          })
        : null,
  };
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
 * Deployed candidates page their materialized ranking by score and job ID,
 * reading only one look-ahead row. Candidates not yet backfilled use a
 * short-lived server-side ranked window so subsequent pages do not repeat the
 * bounded legacy scan.
 */
export async function recommendedJobsPage(
  candidate: CandidateProfile,
  filters: JobFilters,
  cursor: string | null,
  pageSize = PAGE_SIZE,
): Promise<Page<JobRecommendation>> {
  const started = performance.now();
  let documentsRead = 0;
  let rankingAgeMs: number | null = null;
  let result: Page<JobRecommendation> = { items: [], nextCursor: null };
  try {
    const decoded = decodeCursor<RecommendationCursor | WindowCursor>(cursor);
    if (
      candidate.recommendationsVersion !== "match-v1" ||
      decoded?.mode === "window"
    ) {
      result = await fallbackRecommendationsPage(
        candidate,
        filters,
        decoded?.mode === "window" ? decoded : null,
        pageSize,
      );
      // One window read after page one, plus only the hydrated jobs. The first
      // page's bounded legacy scan is intentionally visible in this metric.
      documentsRead = result.items.length + (cursor ? 1 : MAX_RANKED_JOBS);
      return result;
    }

    let query = adminDb()
      .collection(COLLECTIONS.candidates)
      .doc(candidate.userId)
      .collection(COLLECTIONS.recommendations)
      .orderBy("score", "desc")
      .orderBy("jobId", "asc");
    if (decoded?.mode === "projection") {
      query = query.startAfter(decoded.score, decoded.jobId);
    }
    const snap = await query.limit(pageSize + 1).get();
    documentsRead += snap.size;
    const rows = snap.docs.map(
      (doc) => doc.data() as JobRecommendationProjection,
    );
    const pageRows = rows.slice(0, pageSize);
    const hydrated = await hydrateRecommendations(pageRows);
    documentsRead += pageRows.length;
    result = {
      items: hydrated.filter(({ job }) => jobMatchesFilters(job, filters)),
      nextCursor:
        rows.length > pageSize && pageRows.length
          ? encodeCursor<RecommendationCursor>({
              v: 1,
              mode: "projection",
              score: pageRows[pageRows.length - 1].score,
              jobId: pageRows[pageRows.length - 1].jobId,
            })
          : null,
    };
    rankingAgeMs = candidate.recommendationsUpdatedAt
      ? Date.now() - Date.parse(candidate.recommendationsUpdatedAt)
      : null;
    return result;
  } finally {
    console.info(
      JSON.stringify({
        event: "recommendations_read",
        documentsRead,
        resultsReturned: result.items.length,
        documentsReadPerResult: result.items.length
          ? Number((documentsRead / result.items.length).toFixed(2))
          : documentsRead,
        rankingAgeMs,
        latencyMs: Math.round(performance.now() - started),
      }),
    );
  }
}

/** Score a single job against a candidate (job detail page). */
export async function scoreJobForCandidate(
  job: Job,
  candidate: CandidateProfile,
): Promise<JobRecommendation> {
  return { job, ...computeMatch(job, candidate) };
}

export { listAllCandidates };
