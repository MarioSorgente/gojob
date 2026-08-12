import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeProfileStrength } from "../profileStrength";
import { totalExperienceYears } from "../dates";
import { candidateMatchesFilters, type CandidateFilters } from "../search";
import {
  PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  paginateFiltered,
  type Page,
} from "../pagination";
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

interface CandidateCursor {
  strength: number;
  id: string;
}

/**
 * Employer candidate search (scope §18), one page at a time.
 *
 * Only `role` is pushed into the query. Firestore permits a single
 * `array-contains` per query and cannot order by profileStrength while
 * filtering an inequality, so pushing every filter down would need a composite
 * index for each combination of filters the UI can produce. Instead the most
 * selective filter narrows the read, the rest run in memory over paged
 * batches, and paginateFiltered over-fetches to fill the page.
 *
 * The important property: reads now scale with the page, not the collection.
 */
export async function searchCandidatesPage(
  filters: CandidateFilters,
  cursor: string | null,
  pageSize = PAGE_SIZE,
): Promise<Page<CandidateProfile>> {
  const residual: CandidateFilters = { ...filters, role: undefined };

  return paginateFiltered<CandidateProfile>({
    startCursor: cursor,
    pageSize,
    keep: (c) => candidateMatchesFilters(c, residual),
    cursorOf: (c) =>
      encodeCursor<CandidateCursor>({
        strength: c.profileStrength ?? 0,
        id: c.userId,
      }),
    fetchBatch: async (after, limit) => {
      const base = filters.role
        ? col().where("roles", "array-contains", filters.role)
        : col();

      // Tie-break on userId: without a unique final sort key, documents sharing
      // a profileStrength can repeat or disappear across page boundaries.
      let q = base
        .orderBy("profileStrength", "desc")
        .orderBy("userId", "desc");

      const start = decodeCursor<CandidateCursor>(after);
      if (start) q = q.startAfter(start.strength, start.id);

      const snap = await q.limit(limit).get();
      return snap.docs.map((d) => d.data() as CandidateProfile);
    },
  });
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
