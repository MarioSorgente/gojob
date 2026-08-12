import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeProfileStrength } from "../profileStrength";
import { totalExperienceYears } from "../dates";
import { candidateMatchesFilters, type CandidateFilters } from "../search";
import type {
  CandidateProfile,
  CandidateSummary,
  VerificationStatus,
} from "../types";

const col = () => adminDb().collection(COLLECTIONS.candidates);

const DEFAULT_VERIFICATION = {
  phone: "not_submitted" as VerificationStatus,
  id: "not_submitted" as VerificationStatus,
  employment: "not_submitted" as VerificationStatus,
};

export async function getCandidate(
  uid: string,
): Promise<CandidateProfile | null> {
  const snap = await col().doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as CandidateProfile;
}

/**
 * Create or update a candidate profile. Profile strength is always recomputed
 * server-side from the merged result so it can never drift from the data.
 */
export async function upsertCandidate(
  uid: string,
  data: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const ref = col().doc(uid);
  const existing = (await ref.get()).data() as CandidateProfile | undefined;
  const now = new Date().toISOString();

  const merged: CandidateProfile = {
    firstName: "",
    lastName: "",
    photo: null,
    nationality: "",
    workEligibility: false,
    area: "",
    roles: [],
    employmentTypes: [],
    salary: { type: "Monthly", min: null, max: null },
    availability: { type: "Available immediately", availableFrom: null },
    languages: [],
    skills: [],
    experiences: [],
    profileStrength: 0,
    verification: DEFAULT_VERIFICATION,
    createdAt: now,
    ...existing,
    ...data,
    userId: uid,
    updatedAt: now,
  };

  merged.profileStrength = computeProfileStrength(merged).percent;
  await ref.set(merged);
  return merged;
}

export async function setCandidateVerification(
  uid: string,
  field: "phone" | "id" | "employment",
  status: VerificationStatus,
): Promise<void> {
  const ref = col().doc(uid);
  await ref.set({ verification: { [field]: status } }, { merge: true });
  const updated = (await ref.get()).data() as CandidateProfile;
  await ref.set({ profileStrength: computeProfileStrength(updated).percent }, { merge: true });
}

/** Candidates whose desired roles include `role` (the matching engine pool). */
export async function listCandidatesForRole(
  role: string,
): Promise<CandidateProfile[]> {
  const snap = await col().where("roles", "array-contains", role).get();
  return snap.docs.map((d) => d.data() as CandidateProfile);
}

export async function listAllCandidates(): Promise<CandidateProfile[]> {
  const snap = await col().get();
  return snap.docs.map((d) => d.data() as CandidateProfile);
}

/**
 * Employer candidate search (scope §18). Role is pushed down to Firestore when
 * given; the remaining filters are applied in memory (see lib/search.ts).
 * Results are sorted by profile strength so complete profiles surface first.
 */
export async function searchCandidates(
  filters: CandidateFilters,
): Promise<CandidateProfile[]> {
  const candidates = filters.role
    ? await listCandidatesForRole(filters.role)
    : await listAllCandidates();

  return candidates
    .filter((c) => candidateMatchesFilters(c, { ...filters, role: undefined }))
    .sort((a, b) => b.profileStrength - a.profileStrength);
}

/** Build the compact card summary denormalized onto shortlist docs. */
export function toCandidateSummary(c: CandidateProfile): CandidateSummary {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    photo: c.photo,
    area: c.area,
    primaryRole: c.roles[0] ?? "Other",
    yearsExperience: totalExperienceYears(c.experiences),
    salary: c.salary,
    availability: c.availability,
    languages: c.languages,
    verification: c.verification,
  };
}
