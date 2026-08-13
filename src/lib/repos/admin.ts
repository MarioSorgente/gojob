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
  const count = async (query: FirebaseFirestore.Query) =>
    (await query.count().get()).data().count;

  // Aggregation queries are billed by index entries and do not download every
  // source document. Applications and invitations can also be counted directly:
  // their fields are indexed at collection-group scope in firestore.indexes.json.
  const [
    candidates,
    employers,
    businesses,
    verifiedBusinesses,
    jobs,
    liveJobs,
    applications,
    invitations,
    matches,
    hires,
    pendingIdVerifications,
    pendingBusinessVerifications,
  ] = await Promise.all([
    count(db.collection(COLLECTIONS.candidates)),
    count(db.collection(COLLECTIONS.users).where("role", "==", "employer")),
    count(db.collection(COLLECTIONS.businesses)),
    count(
      db
        .collection(COLLECTIONS.businesses)
        .where("verificationStatus", "==", "verified"),
    ),
    count(db.collection(COLLECTIONS.jobs)),
    count(db.collection(COLLECTIONS.jobs).where("status", "==", "live")),
    count(
      db
        .collectionGroup(COLLECTIONS.shortlist)
        .where("candidateAction", "==", "applied"),
    ),
    count(
      db
        .collectionGroup(COLLECTIONS.shortlist)
        .where("employerAction", "==", "invited"),
    ),
    count(db.collection(COLLECTIONS.matches)),
    count(db.collection(COLLECTIONS.hires)),
    count(
      db
        .collection(COLLECTIONS.candidates)
        .where("verification.id", "==", "pending"),
    ),
    count(
      db
        .collection(COLLECTIONS.businesses)
        .where("verificationStatus", "==", "pending"),
    ),
  ]);

  return {
    candidates,
    employers,
    businesses,
    verifiedBusinesses,
    jobs,
    liveJobs,
    applications,
    invitations,
    matches,
    hires,
    pendingIdVerifications,
    pendingBusinessVerifications,
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
