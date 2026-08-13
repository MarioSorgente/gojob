import { totalExperienceYears } from "./dates";
import type { CandidateProfile } from "./types";

/** Versioned, disposable document written to the external candidate index. */
export interface CandidateSearchProjection {
  objectID: string;
  schemaVersion: 1;
  updatedAt: string;
  roles: string[];
  area: string;
  employmentTypes: string[];
  minimumSalary: number | null;
  availability: string;
  languages: Array<{ language: string; level: string }>;
  idVerified: boolean;
  experienceYears: number;
  searchText: string;
  profileStrength: number;
}

export function generateCandidateSearchProjection(
  candidate: CandidateProfile,
): CandidateSearchProjection {
  return {
    objectID: candidate.userId,
    schemaVersion: 1,
    updatedAt: candidate.updatedAt,
    roles: [...candidate.roles],
    area: candidate.area,
    employmentTypes: [...candidate.employmentTypes],
    minimumSalary: candidate.salary.min,
    availability: candidate.availability.type,
    languages: candidate.languages.map(({ language, level }) => ({ language, level })),
    idVerified: candidate.verification.id === "verified",
    experienceYears: totalExperienceYears(candidate.experiences),
    searchText: [
      candidate.firstName,
      candidate.lastName,
      candidate.area,
      ...candidate.roles,
      ...candidate.skills.map(({ name }) => name),
      ...candidate.experiences.flatMap(({ role, companyName }) => [role, companyName]),
    ].join(" "),
    profileStrength: candidate.profileStrength,
  };
}

export interface CandidateSearchHit {
  objectID: string;
}

/**
 * Turns untrusted index hits into current Firestore records. Authorization is
 * checked before any profile read; indexed fields are never returned.
 */
export async function hydrateCandidateSearchResults(
  hits: CandidateSearchHit[],
  authorize: () => Promise<void>,
  loadAuthoritative: (ids: string[]) => Promise<CandidateProfile[]>,
): Promise<CandidateProfile[]> {
  await authorize();
  const ids = [...new Set(hits.map(({ objectID }) => objectID))];
  if (ids.length === 0) return [];
  const current = await loadAuthoritative(ids);
  const byId = new Map(current.map((candidate) => [candidate.userId, candidate]));
  return ids.flatMap((id) => {
    const candidate = byId.get(id);
    return candidate ? [candidate] : [];
  });
}
