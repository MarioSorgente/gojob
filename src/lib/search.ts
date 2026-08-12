/**
 * Filtering helpers for candidate search (§18) and job search (§19).
 *
 * Pure predicates over already-loaded documents. At MVP scale the repos read
 * the (small) collection and filter in memory — this keeps arbitrary filter
 * combinations possible without maintaining a composite index per permutation.
 * Swap for a search service (Algolia/Typesense) when the pool outgrows it.
 */

import { proficiencyRank } from "./taxonomy";
import { totalExperienceYears } from "./dates";
import type { CandidateProfile, Job } from "./types";

export interface CandidateFilters {
  role?: string;
  area?: string;
  minExperience?: number;
  maxSalary?: number;
  availability?: string;
  language?: string;
  minLanguageLevel?: string;
  employmentType?: string;
  verifiedOnly?: boolean;
  query?: string;
}

export interface JobFilters {
  role?: string;
  area?: string;
  employmentType?: string;
  minSalary?: number;
  query?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export function candidateMatchesFilters(
  c: CandidateProfile,
  f: CandidateFilters,
): boolean {
  if (f.role && !c.roles.some((r) => norm(r) === norm(f.role!))) return false;
  if (f.area && norm(c.area) !== norm(f.area)) return false;

  if (f.minExperience != null && f.minExperience > 0) {
    if (totalExperienceYears(c.experiences) < f.minExperience) return false;
  }

  // "Fits my budget": their expected minimum is at or below the cap.
  if (f.maxSalary != null && f.maxSalary > 0) {
    const expected = c.salary?.min;
    if (expected != null && expected > f.maxSalary) return false;
  }

  if (f.availability && c.availability?.type !== f.availability) return false;

  if (f.employmentType && !c.employmentTypes.includes(f.employmentType as never)) {
    return false;
  }

  if (f.language) {
    const held = c.languages.find((l) => norm(l.language) === norm(f.language!));
    if (!held) return false;
    if (
      f.minLanguageLevel &&
      proficiencyRank(held.level) < proficiencyRank(f.minLanguageLevel)
    ) {
      return false;
    }
  }

  if (f.verifiedOnly && c.verification?.id !== "verified") return false;

  if (f.query) {
    const q = norm(f.query);
    const haystack = [
      c.firstName,
      c.lastName,
      c.area,
      ...c.roles,
      ...c.skills.map((s) => s.name),
      ...c.experiences.map((e) => `${e.role} ${e.companyName}`),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function jobMatchesFilters(job: Job, f: JobFilters): boolean {
  if (f.role && norm(job.role) !== norm(f.role)) return false;
  if (f.area && norm(job.area) !== norm(f.area)) return false;
  if (f.employmentType && job.employmentType !== f.employmentType) return false;

  // Show jobs whose top of range clears the candidate's floor.
  if (f.minSalary != null && f.minSalary > 0) {
    const top = job.salaryMax ?? job.salaryMin;
    if (top != null && top < f.minSalary) return false;
  }

  if (f.query) {
    const q = norm(f.query);
    const haystack = [
      job.role,
      job.businessName,
      job.area,
      job.description,
      ...job.skills.map((s) => s.name),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}
