import "server-only";
import { adminDb } from "./firebase/admin";
import { COLLECTIONS } from "./collections";
import { chunk } from "./chunk";
import { computeMatch } from "./matching";
import { generateShortlist, getJob } from "./repos/jobs";
import { getCandidate, listAllCandidates } from "./repos/candidates";
import { resyncCandidateShortlists } from "./repos/rematch";
import type {
  CandidateProfile,
  Job,
  JobRecommendationProjection,
} from "./types";

export const RANKING_VERSION = "match-v1";

type TaskKind = "candidate" | "job";
interface RecommendationTask {
  kind: TaskKind;
  entityId: string;
  status: "queued" | "running" | "failed";
  enqueuedAt: string;
  attempts: number;
  startedAt?: string;
  error?: string;
}

const tasks = () => adminDb().collection(COLLECTIONS.recommendationTasks);
const recommendations = (candidateId: string) =>
  adminDb()
    .collection(COLLECTIONS.candidates)
    .doc(candidateId)
    .collection(COLLECTIONS.recommendations);

/** A stable digest of only fields consumed by computeMatch. */
function projection(job: Job, candidate: CandidateProfile, now: string) {
  const match = computeMatch(job, candidate);
  return {
    jobId: job.id,
    ...match,
    rankingVersion: RANKING_VERSION,
    scoredAt: now,
    jobCreatedAt: job.createdAt,
  } satisfies JobRecommendationProjection;
}

async function refreshCandidate(candidate: CandidateProfile): Promise<void> {
  const liveJobs = await adminDb()
    .collection(COLLECTIONS.jobs)
    .where("status", "==", "live")
    .get();
  await resyncCandidateShortlists(candidate);
  const [jobs, old] = await Promise.all([
    Promise.resolve(
      liveJobs.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Job, "id">),
      })),
    ),
    recommendations(candidate.userId).get(),
  ]);
  const live = new Set(jobs.map((job) => job.id));
  const now = new Date().toISOString();
  const writes: Array<{ id: string; value?: JobRecommendationProjection }> = [
    ...jobs.map((job) => ({
      id: job.id,
      value: projection(job, candidate, now),
    })),
    ...old.docs
      .filter((doc) => !live.has(doc.id))
      .map((doc) => ({ id: doc.id })),
  ];
  for (const group of chunk(writes)) {
    const batch = adminDb().batch();
    for (const write of group) {
      const ref = recommendations(candidate.userId).doc(write.id);
      if (write.value) batch.set(ref, write.value);
      else batch.delete(ref);
    }
    await batch.commit();
  }
  await adminDb().collection(COLLECTIONS.candidates).doc(candidate.userId).set(
    {
      recommendationsVersion: RANKING_VERSION,
      recommendationsUpdatedAt: now,
    },
    { merge: true },
  );
}

async function refreshJob(jobId: string): Promise<void> {
  const [job, candidates] = await Promise.all([
    getJob(jobId),
    listAllCandidates(),
  ]);
  if (job?.status === "live") await generateShortlist(job);
  const now = new Date().toISOString();
  // Two writes per candidate (projection + freshness marker).
  for (const group of chunk(candidates, 225)) {
    const batch = adminDb().batch();
    for (const candidate of group) {
      const ref = recommendations(candidate.userId).doc(jobId);
      if (job?.status === "live")
        batch.set(ref, projection(job, candidate, now));
      else batch.delete(ref);
      batch.set(
        adminDb().collection(COLLECTIONS.candidates).doc(candidate.userId),
        {
          recommendationsVersion: RANKING_VERSION,
          recommendationsUpdatedAt: now,
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
}

/** Claim and execute a bounded number of durable tasks. Safe for overlapping crons. */
export async function drainRecommendationQueue(limit = 5) {
  const snap = await tasks().where("status", "==", "queued").limit(limit).get();
  const stale =
    snap.size < limit
      ? await tasks()
          .where("status", "==", "running")
          .where(
            "startedAt",
            "<=",
            new Date(Date.now() - 10 * 60_000).toISOString(),
          )
          .limit(limit - snap.size)
          .get()
      : null;
  const taskDocs = [...snap.docs, ...(stale?.docs ?? [])];
  let completed = 0;
  let failed = 0;
  for (const doc of taskDocs) {
    const claimed = await adminDb().runTransaction(async (transaction) => {
      const fresh = await transaction.get(doc.ref);
      const data = fresh.data();
      const leaseExpired =
        data?.status === "running" &&
        Date.parse(data.startedAt ?? "") <= Date.now() - 10 * 60_000;
      if (data?.status !== "queued" && !leaseExpired) return null;
      const task = fresh.data() as RecommendationTask;
      transaction.set(
        doc.ref,
        {
          status: "running",
          startedAt: new Date().toISOString(),
          attempts: (task.attempts ?? 0) + 1,
        },
        { merge: true },
      );
      return task;
    });
    if (!claimed) continue;
    const queueDelayMs = Date.now() - Date.parse(claimed.enqueuedAt);
    console.info(
      JSON.stringify({ event: "recommendation_queue_delay", queueDelayMs }),
    );
    try {
      if (claimed.kind === "candidate") {
        const candidate = await getCandidate(claimed.entityId);
        if (candidate) await refreshCandidate(candidate);
      } else {
        await refreshJob(claimed.entityId);
      }
      // A material edit may enqueue this deterministic task again while it is
      // running. Only delete the generation we claimed; preserve a newer one.
      await adminDb().runTransaction(async (transaction) => {
        const current = await transaction.get(doc.ref);
        if (current.data()?.enqueuedAt === claimed.enqueuedAt) {
          transaction.delete(doc.ref);
        }
      });
      completed++;
    } catch (error) {
      failed++;
      console.error(
        JSON.stringify({
          event: "recommendation_projection_failure",
          kind: claimed.kind,
        }),
      );
      await adminDb().runTransaction(async (transaction) => {
        const current = await transaction.get(doc.ref);
        if (current.data()?.enqueuedAt !== claimed.enqueuedAt) return;
        transaction.set(
          doc.ref,
          {
            status: "queued",
            enqueuedAt: new Date().toISOString(),
            error:
              error instanceof Error
                ? error.message.slice(0, 500)
                : String(error),
          },
          { merge: true },
        );
      });
    }
  }
  const expired = await adminDb()
    .collection(COLLECTIONS.recommendationWindows)
    .where("expiresAt", "<=", new Date().toISOString())
    .limit(20)
    .get();
  if (!expired.empty) {
    const batch = adminDb().batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  return {
    inspected: taskDocs.length,
    completed,
    failed,
    expiredWindows: expired.size,
  };
}
