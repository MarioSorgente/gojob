/**
 * Demo marketplace seeding, reset and status.
 *
 * Firestore/Auth handles are injected rather than imported so this module works
 * from both callers: `scripts/seed.ts` (tsx, builds its own admin app) and
 * `/api/admin/seed-demo` (Next server route, uses the shared lazy admin app).
 * That also means no `"server-only"` import here — adding one breaks the CLI.
 *
 * Seeding is idempotent: every document has a fixed `seed-` id and is written
 * with `.set()`, and auth users are created-or-reused. Run it as many times as
 * you like.
 */

import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../collections";
import { chunk } from "../chunk";
import { computeMatch } from "../matching";
import type {
  Business,
  CandidateProfile,
  Conversation,
  Job,
  JobCandidate,
  Match,
  Message,
} from "../types";
import {
  AYU,
  DEMO_ACCOUNTS,
  DEMO_CHAT,
  DEMO_PASSWORD,
  MILK_MADU,
  MILK_MADU_ID,
  MILK_MADU_JOBS,
  OTHER_CANDIDATES,
  PRE_APPLIED_JOB_ID,
  PRE_APPLIED_UIDS,
  REVOLVER,
  REVOLVER_ID,
  REVOLVER_JOB,
  REVOLVER_JOB_ID,
  REVOLVER_OWNER,
  SEED_PREFIX,
  SUNSET_WARUNG,
  WARUNG_ID,
  WARUNG_OWNER,
  buildCandidate,
  poolUid,
  toSummary,
} from "./data";

export interface DemoCtx {
  db: Firestore;
  auth: Auth;
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

async function ensureAuthUser(
  { auth }: DemoCtx,
  email: string,
  displayName: string,
): Promise<string> {
  try {
    const u = await auth.createUser({ email, password: DEMO_PASSWORD, displayName });
    return u.uid;
  } catch (e) {
    if ((e as { code?: string }).code === "auth/email-already-exists") {
      return (await auth.getUserByEmail(email)).uid;
    }
    throw e;
  }
}

async function writeUser(
  { db }: DemoCtx,
  uid: string,
  data: { email: string | null; phone: string | null; role: string; displayName: string },
) {
  await db.collection(COLLECTIONS.users).doc(uid).set({
    email: data.email,
    phone: data.phone,
    role: data.role,
    displayName: data.displayName,
    language: "en",
    onboardingComplete: true,
    createdAt: now(),
  });
}

async function writeCandidate(
  ctx: DemoCtx,
  profile: CandidateProfile,
  email: string | null,
) {
  await ctx.db.collection(COLLECTIONS.candidates).doc(profile.userId).set(profile);
  await writeUser(ctx, profile.userId, {
    email,
    phone: profile.verification.phone === "verified" ? "+6281100000000" : null,
    role: "candidate",
    displayName: `${profile.firstName} ${profile.lastName}`,
  });
}

async function writeBusiness(
  { db }: DemoCtx,
  id: string,
  ownerId: string,
  data: Omit<Business, "id" | "ownerId" | "createdAt">,
): Promise<Business> {
  const business: Business = { id, ownerId, createdAt: now(), ...data };
  await db.collection(COLLECTIONS.businesses).doc(id).set(business);
  return business;
}

/**
 * Write a job and its ranked shortlist, scoring every candidate whose desired
 * roles include the job's role — the same rule as repos/jobs.ts#generateShortlist.
 */
async function writeJobWithShortlist(
  { db }: DemoCtx,
  jobId: string,
  job: Omit<Job, "id" | "createdAt">,
  candidates: CandidateProfile[],
): Promise<number> {
  const pool = candidates.filter((c) =>
    c.roles.some((r) => r.toLowerCase() === job.role.toLowerCase()),
  );

  // Seeded shortlists are complete the moment they're written, so mark them
  // ready — otherwise the job page would poll for a generation that never runs.
  const fullJob: Job = {
    id: jobId,
    createdAt: now(),
    ...job,
    shortlistStatus: "ready",
    shortlistCount: pool.length,
    shortlistUpdatedAt: now(),
  };
  await db.collection(COLLECTIONS.jobs).doc(jobId).set(fullJob);

  // Chunked for the same reason as repos/jobs.ts#generateShortlist: batches
  // cap at 500 writes. The demo pool is far smaller, but the two paths should
  // not differ in a way that only shows up at scale.
  for (const group of chunk(pool)) {
    const batch = db.batch();
    for (const c of group) {
      const { score, breakdown, reasons } = computeMatch(fullJob, c);
      const applied =
        jobId === PRE_APPLIED_JOB_ID && PRE_APPLIED_UIDS.includes(c.userId);
      const entry: JobCandidate = {
        jobId,
        candidateId: c.userId,
        businessId: job.businessId,
        score,
        breakdown,
        reasons,
        employerAction: "none",
        candidateAction: applied ? "applied" : "none",
        stage: applied ? "applied" : "recommended",
        matchId: null,
        conversationId: null,
        candidateSummary: toSummary(c),
        createdAt: now(),
        updatedAt: now(),
      };
      batch.set(
        db
          .collection(COLLECTIONS.jobs)
          .doc(jobId)
          .collection(COLLECTIONS.shortlist)
          .doc(c.userId),
        entry,
      );
    }
    await batch.commit();
  }
  return pool.length;
}

/**
 * Stage a completed mutual match: match + conversation + a short message
 * thread, with the shortlist row flipped to `matched`. Lets chat, unread counts
 * and the interview panel be exercised without first re-enacting a match.
 */
async function writeDemoChat(
  { db }: DemoCtx,
  job: Job,
  candidate: CandidateProfile,
): Promise<void> {
  const { matchId, conversationId, messages } = DEMO_CHAT;
  const employerUid = job.ownerId;
  const participants = [employerUid, candidate.userId];
  const createdAt = now();

  const match: Match = {
    id: matchId,
    jobId: job.id,
    businessId: job.businessId,
    candidateId: candidate.userId,
    participants,
    createdAt,
  };
  await db.collection(COLLECTIONS.matches).doc(matchId).set(match);

  // Space the messages a minute apart so ordering is stable and realistic.
  const base = Date.now() - messages.length * 60_000;
  const sent = messages.map((m, i) => ({
    ...m,
    id: `${SEED_PREFIX}msg-${i + 1}`,
    senderId: m.from === "employer" ? employerUid : candidate.userId,
    createdAt: new Date(base + i * 60_000).toISOString(),
  }));
  const last = sent[sent.length - 1];

  const conversation: Conversation = {
    id: conversationId,
    matchId,
    jobId: job.id,
    businessId: job.businessId,
    candidateId: candidate.userId,
    participants,
    jobRole: job.role,
    businessName: job.businessName,
    candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
    lastMessage: last.body,
    lastMessageAt: last.createdAt,
    // The last message is from the employer, so the candidate owes a reply:
    // give their side a visible unread badge to test against.
    unread: { [employerUid]: 0, [candidate.userId]: 1 },
    createdAt,
  };
  await db.collection(COLLECTIONS.conversations).doc(conversationId).set(conversation);

  const batch = db.batch();
  for (const m of sent) {
    const message: Message = {
      id: m.id,
      conversationId,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.senderId === employerUid ? null : m.createdAt,
    };
    batch.set(
      db
        .collection(COLLECTIONS.conversations)
        .doc(conversationId)
        .collection(COLLECTIONS.messages)
        .doc(m.id),
      message,
    );
  }
  await batch.commit();

  await db
    .collection(COLLECTIONS.jobs)
    .doc(job.id)
    .collection(COLLECTIONS.shortlist)
    .doc(candidate.userId)
    .set(
      {
        employerAction: "invited",
        candidateAction: "applied",
        stage: "matched",
        matchId,
        conversationId,
        updatedAt: createdAt,
      },
      { merge: true },
    );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface SeedResult {
  projectId: string;
  candidates: number;
  businesses: number;
  jobs: { id: string; role: string; status: string; shortlisted: number }[];
  logins: { role: string; email: string; password: string }[];
}

export async function runSeed(ctx: DemoCtx, projectId: string): Promise<SeedResult> {
  const { db } = ctx;

  // --- Accounts ---
  const adminUid = await ensureAuthUser(ctx, DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.displayName);
  await writeUser(ctx, adminUid, {
    email: DEMO_ACCOUNTS.admin.email,
    phone: null,
    role: "admin",
    displayName: DEMO_ACCOUNTS.admin.displayName,
  });

  const employerUid = await ensureAuthUser(ctx, DEMO_ACCOUNTS.employer.email, DEMO_ACCOUNTS.employer.displayName);
  await writeUser(ctx, employerUid, {
    email: DEMO_ACCOUNTS.employer.email,
    phone: null,
    role: "employer",
    displayName: DEMO_ACCOUNTS.employer.displayName,
  });

  // --- Businesses ---
  const milkMadu = await writeBusiness(ctx, MILK_MADU_ID, employerUid, MILK_MADU);
  const revolver = await writeBusiness(ctx, REVOLVER_ID, REVOLVER_OWNER, REVOLVER);
  await writeBusiness(ctx, WARUNG_ID, WARUNG_OWNER, SUNSET_WARUNG);

  // --- Candidates ---
  const candidates: CandidateProfile[] = [];

  const ayuUid = await ensureAuthUser(ctx, DEMO_ACCOUNTS.candidate.email, DEMO_ACCOUNTS.candidate.displayName);
  const ayu = buildCandidate({ uid: ayuUid, ...AYU });
  await writeCandidate(ctx, ayu, DEMO_ACCOUNTS.candidate.email);
  candidates.push(ayu);

  for (let i = 0; i < OTHER_CANDIDATES.length; i++) {
    const profile = buildCandidate({ uid: poolUid(i + 1), ...OTHER_CANDIDATES[i] });
    await writeCandidate(ctx, profile, null);
    candidates.push(profile);
  }

  // --- Jobs ---
  const jobs: SeedResult["jobs"] = [];

  for (const { id, job } of MILK_MADU_JOBS) {
    const shortlisted = await writeJobWithShortlist(
      ctx,
      id,
      {
        ...job,
        businessId: milkMadu.id,
        ownerId: employerUid,
        businessName: milkMadu.name,
        businessVerified: milkMadu.verificationStatus === "verified",
      },
      candidates,
    );
    jobs.push({ id, role: job.role, status: job.status, shortlisted });
  }

  const revolverShortlisted = await writeJobWithShortlist(
    ctx,
    REVOLVER_JOB_ID,
    {
      ...REVOLVER_JOB,
      businessId: revolver.id,
      ownerId: REVOLVER_OWNER,
      businessName: revolver.name,
      businessVerified: true,
    },
    candidates,
  );
  jobs.push({
    id: REVOLVER_JOB_ID,
    role: REVOLVER_JOB.role,
    status: REVOLVER_JOB.status,
    shortlisted: revolverShortlisted,
  });

  // --- Pre-staged match + chat on the Milk & Madu barista job ---
  const chatJobSnap = await db.collection(COLLECTIONS.jobs).doc(DEMO_CHAT.jobId).get();
  if (chatJobSnap.exists) {
    const chatJob = { id: DEMO_CHAT.jobId, ...(chatJobSnap.data() as Omit<Job, "id">) };
    await writeDemoChat(ctx, chatJob, ayu);
  }

  return {
    projectId,
    candidates: candidates.length,
    businesses: 3,
    jobs,
    logins: [
      { role: "employer", email: DEMO_ACCOUNTS.employer.email, password: DEMO_PASSWORD },
      { role: "candidate", email: DEMO_ACCOUNTS.candidate.email, password: DEMO_PASSWORD },
      { role: "admin", email: DEMO_ACCOUNTS.admin.email, password: DEMO_PASSWORD },
    ],
  };
}

export interface StatusResult {
  projectId: string;
  credentialSource: string;
  emulator: boolean;
  counts: Record<string, number>;
  demoAccounts: { email: string; exists: boolean; uid: string | null }[];
}

/**
 * Read-only health check. Run this before seeding: it is the only cheap way to
 * catch the silent failure where the admin env vars are missing and
 * projectIdFromEnv() falls back to "demo-gojob", pointing the whole app at a
 * project that doesn't exist.
 */
export async function runStatus(
  ctx: DemoCtx,
  meta: { projectId: string; credentialSource: string; emulator: boolean },
): Promise<StatusResult> {
  const { db, auth } = ctx;

  const collections = [
    COLLECTIONS.users,
    COLLECTIONS.candidates,
    COLLECTIONS.businesses,
    COLLECTIONS.jobs,
    COLLECTIONS.matches,
    COLLECTIONS.conversations,
    COLLECTIONS.hires,
  ];

  const counts: Record<string, number> = {};
  await Promise.all(
    collections.map(async (name) => {
      const snap = await db.collection(name).count().get();
      counts[name] = snap.data().count;
    }),
  );

  const demoAccounts = await Promise.all(
    Object.values(DEMO_ACCOUNTS).map(async ({ email }) => {
      try {
        const u = await auth.getUserByEmail(email);
        return { email, exists: true, uid: u.uid };
      } catch {
        return { email, exists: false, uid: null };
      }
    }),
  );

  return { ...meta, counts, demoAccounts };
}

export interface ResetResult {
  deleted: Record<string, number>;
}

/**
 * Delete the documents a predicate selects, plus any named subcollections.
 *
 * Firestore has no prefix operator, so the selection happens in memory. That is
 * fine at demo scale, matches how the rest of the app filters (listLiveJobs,
 * searchCandidates), and lets callers match on referenced ids rather than only
 * on the document id.
 */
async function deleteDocsWhere(
  db: Firestore,
  collection: string,
  selects: (id: string, data: Record<string, unknown>) => boolean,
  subcollections: string[] = [],
): Promise<number> {
  const snap = await db.collection(collection).get();
  const doomed = snap.docs.filter((d) => selects(d.id, d.data()));

  for (const doc of doomed) {
    for (const sub of subcollections) {
      const children = await doc.ref.collection(sub).get();
      await Promise.all(children.docs.map((c) => c.ref.delete()));
    }
    await doc.ref.delete();
  }
  return doomed.length;
}

const isSeedId = (id: string) => id.startsWith(SEED_PREFIX);

/**
 * Remove everything seeding created. Scoped to seeded ids plus the three demo
 * accounts, so anything you registered yourself while testing survives.
 *
 * Matches, conversations, interviews and hires are also removed when they
 * *reference* a seeded job, business or candidate — those get real generated
 * ids when the app produces them during testing, so an id check alone would
 * leave them orphaned.
 */
export async function runReset(ctx: DemoCtx): Promise<ResetResult> {
  const { db, auth } = ctx;
  const deleted: Record<string, number> = {};

  // The demo logins have generated uids, not seeded ones. Collect them so
  // documents referencing those uids are cleaned up too.
  const demoUids = new Set<string>();
  for (const { email } of Object.values(DEMO_ACCOUNTS)) {
    try {
      demoUids.add((await auth.getUserByEmail(email)).uid);
    } catch {
      // Account doesn't exist yet — nothing to collect.
    }
  }
  const touchesDemo = (data: Record<string, unknown>, fields: string[]) =>
    fields.some((f) => {
      const v = data[f];
      return typeof v === "string" && (v.startsWith(SEED_PREFIX) || demoUids.has(v));
    });
  const linkFields = ["jobId", "businessId", "candidateId"];

  deleted.jobs = await deleteDocsWhere(db, COLLECTIONS.jobs, isSeedId, [
    COLLECTIONS.shortlist,
  ]);
  deleted.conversations = await deleteDocsWhere(
    db,
    COLLECTIONS.conversations,
    (id, d) => isSeedId(id) || touchesDemo(d, linkFields),
    [COLLECTIONS.messages],
  );
  deleted.matches = await deleteDocsWhere(
    db,
    COLLECTIONS.matches,
    (id, d) => isSeedId(id) || touchesDemo(d, linkFields),
  );
  deleted.hires = await deleteDocsWhere(
    db,
    COLLECTIONS.hires,
    (id, d) => isSeedId(id) || touchesDemo(d, linkFields),
  );
  deleted.interviews = await deleteDocsWhere(
    db,
    COLLECTIONS.interviews,
    (id, d) => isSeedId(id) || touchesDemo(d, ["jobId", "conversationId", "matchId"]),
  );
  deleted.businesses = await deleteDocsWhere(db, COLLECTIONS.businesses, isSeedId);
  deleted.candidates = await deleteDocsWhere(db, COLLECTIONS.candidates, isSeedId);
  deleted.users = await deleteDocsWhere(db, COLLECTIONS.users, isSeedId);

  // The three real Auth accounts have generated uids, not `seed-` ids, so they
  // need removing by email. Their Firestore docs go too.
  let accounts = 0;
  for (const { email } of Object.values(DEMO_ACCOUNTS)) {
    try {
      const user = await auth.getUserByEmail(email);
      await db.collection(COLLECTIONS.users).doc(user.uid).delete();
      await db.collection(COLLECTIONS.candidates).doc(user.uid).delete();
      await auth.deleteUser(user.uid);
      accounts++;
    } catch {
      // Already gone — nothing to do.
    }
  }
  deleted.demoAccounts = accounts;

  return { deleted };
}

export interface GrantRoleResult {
  uid: string;
  email: string;
  role: string;
  createdUserDoc: boolean;
}

/**
 * Promote an existing login to a role. The app has no UI for becoming an admin
 * (onboarding only offers employer/candidate), so this is how a real account —
 * e.g. one created with Google sign-in — reaches /admin.
 */
export async function grantRole(
  { db, auth }: DemoCtx,
  email: string,
  role: "admin" | "employer" | "candidate",
): Promise<GrantRoleResult> {
  const user = await auth.getUserByEmail(email);
  const ref = db.collection(COLLECTIONS.users).doc(user.uid);
  const existing = await ref.get();

  if (existing.exists) {
    await ref.set({ role }, { merge: true });
  } else {
    await ref.set({
      email: user.email ?? null,
      phone: user.phoneNumber ?? null,
      role,
      displayName: user.displayName ?? null,
      language: "en",
      // Admins have no onboarding flow of their own; employers and candidates
      // still need theirs, so don't mark those complete here.
      onboardingComplete: role === "admin",
      createdAt: now(),
    });
  }

  return {
    uid: user.uid,
    email: user.email ?? email,
    role,
    createdUserDoc: !existing.exists,
  };
}
