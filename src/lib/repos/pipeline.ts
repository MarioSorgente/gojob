import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeMatch } from "../matching";
import { getJob } from "./jobs";
import { getCandidate, toCandidateSummary } from "./candidates";
import type {
  Conversation,
  EmployerAction,
  Job,
  JobCandidate,
  Match,
} from "../types";

const jobsCol = () => adminDb().collection(COLLECTIONS.jobs);
const shortlistDoc = (jobId: string, candidateId: string) =>
  jobsCol().doc(jobId).collection(COLLECTIONS.shortlist).doc(candidateId);

export interface HydratedEntry {
  entry: JobCandidate;
  job: Job;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** A job's shortlist, ranked highest-first (employer recommended candidates). */
export async function getShortlist(jobId: string): Promise<JobCandidate[]> {
  const snap = await jobsCol()
    .doc(jobId)
    .collection(COLLECTIONS.shortlist)
    .get();
  return snap.docs
    .map((d) => d.data() as JobCandidate)
    .sort((a, b) => b.score - a.score);
}

export interface ShortlistCounts {
  total: number;
  applied: number;
  matched: number;
}

/**
 * Headline counts for a job's shortlist.
 *
 * The employer dashboard rendered three integers per job by reading every
 * shortlist document in full — each of which embeds a whole candidateSummary.
 * Ten jobs with fifty candidates meant ~500 document reads and a few hundred KB
 * on the employer's landing page, every single visit. These are aggregation
 * queries: the server returns the counts, never the documents.
 */
export async function getShortlistCounts(jobId: string): Promise<ShortlistCounts> {
  const col = jobsCol().doc(jobId).collection(COLLECTIONS.shortlist);

  const [total, applied, matched] = await Promise.all([
    col.count().get(),
    col.where("candidateAction", "==", "applied").count().get(),
    col.where("stage", "in", ["matched", "interview", "hired"]).count().get(),
  ]);

  return {
    total: total.data().count,
    applied: applied.data().count,
    matched: matched.data().count,
  };
}

export async function getJobCandidate(
  jobId: string,
  candidateId: string,
): Promise<JobCandidate | null> {
  const snap = await shortlistDoc(jobId, candidateId).get();
  return snap.exists ? (snap.data() as JobCandidate) : null;
}

async function hydrateWithJobs(entries: JobCandidate[]): Promise<HydratedEntry[]> {
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
    .filter((x): x is HydratedEntry => x !== null);
}

/** All shortlist rows for one candidate across every job. */
async function candidateEntries(candidateId: string): Promise<JobCandidate[]> {
  const snap = await adminDb()
    .collectionGroup(COLLECTIONS.shortlist)
    .where("candidateId", "==", candidateId)
    .get();
  return snap.docs.map((d) => d.data() as JobCandidate);
}

/** Invitations awaiting the candidate's response. */
export async function listCandidateInvitations(
  candidateId: string,
): Promise<HydratedEntry[]> {
  const entries = (await candidateEntries(candidateId)).filter(
    (e) =>
      e.employerAction === "invited" &&
      e.candidateAction === "none" &&
      e.stage !== "matched",
  );
  return hydrateWithJobs(entries);
}

export async function listCandidateApplications(
  candidateId: string,
): Promise<HydratedEntry[]> {
  const entries = (await candidateEntries(candidateId)).filter(
    (e) => e.candidateAction === "applied",
  );
  return hydrateWithJobs(entries);
}

export async function listCandidateMatches(
  candidateId: string,
): Promise<HydratedEntry[]> {
  const entries = (await candidateEntries(candidateId)).filter(
    (e) => e.matchId !== null,
  );
  return hydrateWithJobs(entries);
}

// ---------------------------------------------------------------------------
// Mutual match
// ---------------------------------------------------------------------------

/**
 * Create the Match + Conversation for a (job, candidate) pair and flip the
 * shortlist row to `matched`. Idempotent: if a match already exists, returns it.
 */
async function createMatch(
  job: Job,
  entry: JobCandidate,
): Promise<{ matchId: string; conversationId: string }> {
  if (entry.matchId) {
    return {
      matchId: entry.matchId,
      conversationId: entry.conversationId ?? entry.matchId,
    };
  }

  const now = new Date().toISOString();
  const participants = [job.ownerId, entry.candidateId];
  const candidateName =
    `${entry.candidateSummary.firstName} ${entry.candidateSummary.lastName}`.trim();

  const matchRef = adminDb().collection(COLLECTIONS.matches).doc();
  const match: Omit<Match, "id"> = {
    jobId: job.id,
    businessId: job.businessId,
    candidateId: entry.candidateId,
    participants,
    createdAt: now,
  };
  await matchRef.set(match);

  const convRef = adminDb().collection(COLLECTIONS.conversations).doc();
  const conversation: Omit<Conversation, "id"> = {
    matchId: matchRef.id,
    jobId: job.id,
    businessId: job.businessId,
    candidateId: entry.candidateId,
    participants,
    jobRole: job.role,
    businessName: job.businessName,
    candidateName,
    lastMessage: null,
    lastMessageAt: null,
    unread: { [job.ownerId]: 0, [entry.candidateId]: 0 },
    createdAt: now,
  };
  await convRef.set(conversation);

  await shortlistDoc(job.id, entry.candidateId).set(
    {
      stage: "matched",
      matchId: matchRef.id,
      conversationId: convRef.id,
      updatedAt: now,
    },
    { merge: true },
  );

  return { matchId: matchRef.id, conversationId: convRef.id };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ActionResult {
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  /**
   * Set when the action was refused for a reason worth showing the user (today,
   * only rate limiting). Returned rather than thrown because Next redacts
   * server-action error messages in production builds — a thrown message would
   * reach the browser as a generic digest and the user would learn nothing.
   */
  error?: string;
}

/**
 * Make sure a (job, candidate) shortlist row exists, scoring it if it doesn't.
 * Needed when an employer invites someone found via search (§18) who wasn't in
 * the job's auto-generated pool.
 */
export async function ensureShortlistEntry(
  jobId: string,
  candidateId: string,
): Promise<JobCandidate> {
  const existing = await getJobCandidate(jobId, candidateId);
  if (existing) return existing;

  const [job, candidate] = await Promise.all([
    getJob(jobId),
    getCandidate(candidateId),
  ]);
  if (!job) throw new Error("Job not found");
  if (!candidate) throw new Error("Candidate not found");

  const { score, breakdown, reasons } = computeMatch(job, candidate);
  const now = new Date().toISOString();
  const entry: JobCandidate = {
    jobId,
    candidateId,
    businessId: job.businessId,
    score,
    breakdown,
    reasons,
    employerAction: "none",
    candidateAction: "none",
    stage: "recommended",
    matchId: null,
    conversationId: null,
    candidateSummary: toCandidateSummary(candidate),
    createdAt: now,
    updatedAt: now,
  };
  await shortlistDoc(jobId, candidateId).set(entry);
  return entry;
}

/**
 * Employer taps Pass / Save / Invite on a candidate card, or clears a previous
 * action with "none".
 *
 * "none" is the undo path — reachable today from unsaving on the shortlist.
 * Saving deliberately never changed `stage`, so clearing it needs nothing else
 * rewound and the candidate returns to the swipe deck, which filters on
 * `employerAction === "none" && stage === "recommended"`. Undoing a *pass* also
 * has to restore the stage, since passing does move it to "rejected".
 */
export async function setEmployerAction(
  jobId: string,
  candidateId: string,
  action: EmployerAction,
): Promise<ActionResult> {
  const entry = await getJobCandidate(jobId, candidateId);
  if (!entry) throw new Error("Shortlist entry not found");
  const now = new Date().toISOString();

  if (action === "none") {
    await shortlistDoc(jobId, candidateId).set(
      {
        employerAction: "none",
        // Only rewind the stage if this action is what set it to rejected;
        // never resurrect a matched or hired pair.
        ...(entry.stage === "rejected" && entry.candidateAction !== "passed"
          ? { stage: "recommended" }
          : {}),
        updatedAt: now,
      },
      { merge: true },
    );
    return { matched: false };
  }

  if (action === "passed") {
    await shortlistDoc(jobId, candidateId).set(
      { employerAction: "passed", stage: "rejected", updatedAt: now },
      { merge: true },
    );
    return { matched: false };
  }

  if (action === "saved") {
    await shortlistDoc(jobId, candidateId).set(
      { employerAction: "saved", updatedAt: now },
      { merge: true },
    );
    return { matched: false };
  }

  // action === "invited"
  await shortlistDoc(jobId, candidateId).set(
    { employerAction: "invited", updatedAt: now },
    { merge: true },
  );

  // Mutual interest already? (candidate applied earlier) -> match now.
  if (entry.candidateAction === "applied") {
    const job = await getJob(jobId);
    if (!job) throw new Error("Job not found");
    const { matchId, conversationId } = await createMatch(job, {
      ...entry,
      employerAction: "invited",
    });
    return { matched: true, matchId, conversationId };
  }

  return { matched: false };
}

/** Candidate applies to a job (or accepts an invitation) — signals interest. */
export async function candidateApply(
  jobId: string,
  candidateId: string,
): Promise<ActionResult> {
  // The row is missing whenever the candidate wasn't in the job's generated
  // pool: they registered after the job was posted (the whole point of the
  // public share link, §20), or their desired roles don't include this one.
  // Score it on demand, exactly as the employer's invite-from-search does.
  const entry = await ensureShortlistEntry(jobId, candidateId);
  const now = new Date().toISOString();

  await shortlistDoc(jobId, candidateId).set(
    {
      candidateAction: "applied",
      stage: entry.stage === "recommended" ? "applied" : entry.stage,
      updatedAt: now,
    },
    { merge: true },
  );

  if (entry.employerAction === "invited") {
    const job = await getJob(jobId);
    if (!job) throw new Error("Job not found");
    const { matchId, conversationId } = await createMatch(job, {
      ...entry,
      candidateAction: "applied",
    });
    return { matched: true, matchId, conversationId };
  }

  return { matched: false };
}

export async function candidatePass(
  jobId: string,
  candidateId: string,
): Promise<void> {
  // Same reason as candidateApply. Without this the merge below would create a
  // partial row with no jobId/score/candidateSummary, which then breaks the
  // applications list and the employer's shortlist rendering.
  await ensureShortlistEntry(jobId, candidateId);
  await shortlistDoc(jobId, candidateId).set(
    {
      candidateAction: "passed",
      stage: "rejected",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** Candidate accepts (=apply/match) or declines an employer invitation. */
export async function respondToInvitation(
  jobId: string,
  candidateId: string,
  accept: boolean,
): Promise<ActionResult> {
  if (accept) return candidateApply(jobId, candidateId);
  await candidatePass(jobId, candidateId);
  return { matched: false };
}

/** Employer marks the candidate as hired (scope §17). */
export async function markHired(
  jobId: string,
  candidateId: string,
): Promise<void> {
  const entry = await getJobCandidate(jobId, candidateId);
  if (!entry) throw new Error("Shortlist entry not found");
  const now = new Date().toISOString();

  const hireRef = adminDb().collection(COLLECTIONS.hires).doc();
  await hireRef.set({
    jobId,
    candidateId,
    businessId: entry.businessId,
    date: now.slice(0, 10),
    createdAt: now,
  });

  await shortlistDoc(jobId, candidateId).set(
    { stage: "hired", updatedAt: now },
    { merge: true },
  );
}
