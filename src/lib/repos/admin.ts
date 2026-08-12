import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeProfileStrength } from "../profileStrength";
import type {
  AppUser,
  Business,
  CandidateProfile,
  Hire,
  Job,
  VerificationStatus,
} from "../types";

/** Marketplace health at a glance (scope §33). */
export interface MarketplaceMetrics {
  candidates: number;
  employers: number;
  businesses: number;
  verifiedBusinesses: number;
  jobs: number;
  liveJobs: number;
  applications: number;
  invitations: number;
  matches: number;
  hires: number;
  pendingIdVerifications: number;
  pendingBusinessVerifications: number;
  /** Matches ÷ live jobs — how well supply is meeting demand. */
  matchesPerLiveJob: number;
}

export async function getMarketplaceMetrics(): Promise<MarketplaceMetrics> {
  const db = adminDb();
  const [usersSnap, candidatesSnap, businessesSnap, jobsSnap, matchesSnap, hiresSnap] =
    await Promise.all([
      db.collection(COLLECTIONS.users).get(),
      db.collection(COLLECTIONS.candidates).get(),
      db.collection(COLLECTIONS.businesses).get(),
      db.collection(COLLECTIONS.jobs).get(),
      db.collection(COLLECTIONS.matches).get(),
      db.collection(COLLECTIONS.hires).get(),
    ]);

  const users = usersSnap.docs.map((d) => d.data() as AppUser);
  const candidates = candidatesSnap.docs.map((d) => d.data() as CandidateProfile);
  const businesses = businessesSnap.docs.map((d) => d.data() as Business);
  const jobs = jobsSnap.docs.map((d) => d.data() as Job);

  // Applications/invitations live on the per-job shortlist subcollections.
  const shortlistSnap = await db.collectionGroup(COLLECTIONS.shortlist).get();
  const entries = shortlistSnap.docs.map((d) => d.data() as { candidateAction?: string; employerAction?: string });

  const liveJobs = jobs.filter((j) => j.status === "live").length;
  const matches = matchesSnap.size;

  return {
    candidates: candidates.length,
    employers: users.filter((u) => u.role === "employer").length,
    businesses: businesses.length,
    verifiedBusinesses: businesses.filter((b) => b.verificationStatus === "verified")
      .length,
    jobs: jobs.length,
    liveJobs,
    applications: entries.filter((e) => e.candidateAction === "applied").length,
    invitations: entries.filter((e) => e.employerAction === "invited").length,
    matches,
    hires: hiresSnap.size,
    pendingIdVerifications: candidates.filter((c) => c.verification?.id === "pending")
      .length,
    pendingBusinessVerifications: businesses.filter(
      (b) => b.verificationStatus === "pending",
    ).length,
    matchesPerLiveJob: liveJobs ? Number((matches / liveJobs).toFixed(1)) : 0,
  };
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await adminDb().collection(COLLECTIONS.users).get();
  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<AppUser, "uid">) }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function listAllBusinesses(): Promise<Business[]> {
  const snap = await adminDb().collection(COLLECTIONS.businesses).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Business, "id">) }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function listAllJobs(): Promise<Job[]> {
  const snap = await adminDb().collection(COLLECTIONS.jobs).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Job, "id">) }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function listAllCandidateProfiles(): Promise<CandidateProfile[]> {
  const snap = await adminDb().collection(COLLECTIONS.candidates).get();
  return snap.docs
    .map((d) => d.data() as CandidateProfile)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function listRecentHires(): Promise<Hire[]> {
  const snap = await adminDb().collection(COLLECTIONS.hires).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Hire, "id">) }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// --- Moderation actions -----------------------------------------------------

/** Re-derive profileStrength after a verification decision so it never drifts. */
async function refreshStrength(candidateId: string): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.candidates).doc(candidateId);
  const profile = (await ref.get()).data() as CandidateProfile | undefined;
  if (!profile) return;
  await ref.set(
    { profileStrength: computeProfileStrength(profile).percent },
    { merge: true },
  );
}

export async function setCandidateIdStatus(
  candidateId: string,
  status: VerificationStatus,
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.candidates)
    .doc(candidateId)
    .set({ verification: { id: status } }, { merge: true });
  await refreshStrength(candidateId);
}

export async function setCandidateEmploymentStatus(
  candidateId: string,
  status: VerificationStatus,
): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.candidates).doc(candidateId);
  const snap = await ref.get();
  const profile = snap.data() as CandidateProfile | undefined;
  if (!profile) return;

  // Reflect the decision on every experience awaiting review.
  const experiences = (profile.experiences ?? []).map((e) =>
    e.verificationStatus === "pending" ? { ...e, verificationStatus: status } : e,
  );
  await ref.set({ verification: { employment: status }, experiences }, { merge: true });
  await refreshStrength(candidateId);
}

export async function setBusinessStatus(
  businessId: string,
  status: VerificationStatus,
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.businesses)
    .doc(businessId)
    .set({ verificationStatus: status }, { merge: true });
}

export async function setJobStatus(
  jobId: string,
  status: "live" | "closed",
): Promise<void> {
  await adminDb().collection(COLLECTIONS.jobs).doc(jobId).set({ status }, { merge: true });
}
