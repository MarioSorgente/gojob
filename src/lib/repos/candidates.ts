import "server-only";
import { adminDb } from "../firebase/admin";
import { COLLECTIONS } from "../collections";
import { computeProfileStrength } from "../profileStrength";
import { totalExperienceYears } from "../dates";
import { candidateMatchesFilters, type CandidateFilters } from "../search";
import { withIndexFallback } from "../firestoreErrors";
import { recordCandidateSearch } from "../candidateSearchMetrics";
import {
  candidateMatchingFingerprint,
  enqueueCandidateRecommendations,
} from "../recommendationTasks";
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
  if (
    candidateMatchingFingerprint(existing) !==
    candidateMatchingFingerprint(merged)
  ) {
    await enqueueCandidateRecommendations(uid);
  }
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
  await ref.set(
    { profileStrength: computeProfileStrength(updated).percent },
    { merge: true },
  );
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

const DEFAULT_FALLBACK_READ_BUDGET = 500;

function fallbackReadBudget(): number {
  const configured = Number(process.env.CANDIDATE_SEARCH_FALLBACK_READ_BUDGET);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_FALLBACK_READ_BUDGET;
}

interface CandidateCursor {
  strength: number;
  id: string;
}

function candidateCursor(candidate: CandidateProfile): string {
  return encodeCursor<CandidateCursor>({
    strength: candidate.profileStrength ?? 0,
    id: candidate.userId,
  });
}

/** Remove UI defaults which do not represent genuine predicates. */
export function normalizeCandidateFilters(
  filters: CandidateFilters,
): CandidateFilters {
  const normalized: CandidateFilters = {};
  for (const [key, value] of Object.entries(filters) as [
    keyof CandidateFilters,
    CandidateFilters[keyof CandidateFilters],
  ][]) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) (normalized as Record<string, unknown>)[key] = trimmed;
    } else if (typeof value === "number") {
      if (Number.isFinite(value) && value > 0)
        (normalized as Record<string, unknown>)[key] = value;
    } else if (value === true) {
      (normalized as Record<string, unknown>)[key] = true;
    }
  }
  return normalized;
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
  const startedAt = performance.now();
  let documentsFetched = 0;
  let fetchRounds = 0;
  let usedIndexFallback = false;
  let fallbackBudgetExhausted = false;
  let page: Page<CandidateProfile> | undefined;
  const normalized = normalizeCandidateFilters(filters);
  const { role, ...residual } = normalized;
  const hasResidualPredicate = Object.keys(residual).length > 0;

  const fetchOrdered = async (after: string | null, limit: number) => {
    const base = role ? col().where("roles", "array-contains", role) : col();
    let q = base.orderBy("profileStrength", "desc").orderBy("userId", "desc");
    const start = decodeCursor<CandidateCursor>(after);
    if (start) q = q.startAfter(start.strength, start.id);
    const snap = await q.limit(limit).get();
    fetchRounds += 1;
    documentsFetched += snap.docs.length;
    return snap.docs.map((d) => d.data() as CandidateProfile);
  };

  try {
    page = await withIndexFallback(
      "searchCandidatesPage",
      async () => {
        if (!hasResidualPredicate) {
          const candidates = await fetchOrdered(cursor, pageSize + 1);
          const items = candidates.slice(0, pageSize);
          return {
            items,
            nextCursor:
              candidates.length > pageSize && items.length
                ? candidateCursor(items[items.length - 1])
                : null,
          };
        }
        return paginateFiltered<CandidateProfile>({
          startCursor: cursor,
          pageSize,
          keep: (c) => candidateMatchesFilters(c, residual),
          cursorOf: candidateCursor,
          fetchBatch: fetchOrdered,
        });
      },
      async () => {
        usedIndexFallback = true;
        const budget = fallbackReadBudget();
        const snap = await col()
          .limit(budget + 1)
          .get();
        const all = snap.docs
          .slice(0, budget)
          .map((d) => d.data() as CandidateProfile);
        fetchRounds += 1;
        documentsFetched += snap.docs.length;
        fallbackBudgetExhausted = snap.docs.length > budget;
        if (fallbackBudgetExhausted) {
          console.error(
            `[candidate-search] fallback read budget exhausted (${budget}); returning a degraded bounded result`,
          );
        }
        const candidates = all
          .filter((candidate) => candidateMatchesFilters(candidate, normalized))
          .sort(
            (a, b) =>
              (b.profileStrength ?? 0) - (a.profileStrength ?? 0) ||
              b.userId.localeCompare(a.userId),
          );
        const start = decodeCursor<CandidateCursor>(cursor);
        const offset = start
          ? candidates.findIndex(
              (candidate) =>
                (candidate.profileStrength ?? 0) === start.strength &&
                candidate.userId === start.id,
            ) + 1
          : 0;
        const safeOffset = offset > 0 ? offset : 0;
        const items = candidates.slice(safeOffset, safeOffset + pageSize);
        const next = safeOffset + items.length;
        return {
          items,
          nextCursor:
            !fallbackBudgetExhausted &&
            next < candidates.length &&
            items.length > 0
              ? candidateCursor(items[items.length - 1])
              : null,
        };
      },
    );
    return page;
  } finally {
    // Deliberately emit only counts and booleans. Filter values, identities and
    // cursors can contain personal/search data and must never enter telemetry.
    recordCandidateSearch({
      event: "candidate_search",
      documentsFetched,
      resultsReturned: page?.items.length ?? 0,
      fetchRounds,
      latencyMs: Math.round(performance.now() - startedAt),
      exhausted: page?.nextCursor === null,
      usedIndexFallback,
      fallbackBudgetExhausted,
      activeFilters: Object.keys(normalized) as (keyof CandidateFilters)[],
      activeFilterCount: Object.keys(normalized).length,
    });
  }
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
