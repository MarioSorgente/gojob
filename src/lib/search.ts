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

/**
 * Working time used to compare a daily or hourly rate against a monthly filter.
 *
 * Both salary filters are expressed per month, but candidates and jobs may
 * state Daily or Hourly rates. Comparing those raw numbers against a monthly
 * cap is meaningless — a 500k **daily** rate looked cheaper than an 8M monthly
 * budget and was shown as a match, when it is roughly 13M a month.
 *
 * These are approximations; hospitality shifts vary. They are named and
 * exported so the assumption is reviewable rather than buried in a comparison.
 */
export const WORKING_DAYS_PER_MONTH = 26;
export const WORKING_HOURS_PER_DAY = 8;

/** Convert any salary rate to a monthly equivalent, or null when unknown. */
export function toMonthlyIDR(
  amount: number | null | undefined,
  salaryType: string | null | undefined,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  switch (salaryType) {
    case "Daily":
      return amount * WORKING_DAYS_PER_MONTH;
    case "Hourly":
      return amount * WORKING_HOURS_PER_DAY * WORKING_DAYS_PER_MONTH;
    default:
      return amount; // Monthly, and anything unrecognised
  }
}

export function candidateMatchesFilters(
  c: CandidateProfile,
  f: CandidateFilters,
): boolean {
  if (f.role && !c.roles.some((r) => norm(r) === norm(f.role!))) return false;
  if (f.area && norm(c.area) !== norm(f.area)) return false;

  if (f.minExperience != null && f.minExperience > 0) {
    if (totalExperienceYears(c.experiences) < f.minExperience) return false;
  }

  // "Fits my budget": their expected minimum, as a monthly figure, is at or
  // below the cap.
  //
  // A candidate who has stated no expectation is **excluded**. Previously the
  // check was skipped when the figure was missing, so setting a cap still
  // returned candidates whose expectation was unknown or expressed daily — a
  // salary filter that keeps everything it cannot verify is not a filter.
  if (f.maxSalary != null && f.maxSalary > 0) {
    const expected = toMonthlyIDR(
      c.salary?.min ?? c.salary?.max,
      c.salary?.type,
    );
    if (expected == null || expected > f.maxSalary) return false;
  }

  if (
    f.availability &&
    norm(c.availability?.type ?? "") !== norm(f.availability)
  ) {
    return false;
  }

  if (
    f.employmentType &&
    !c.employmentTypes.some((e) => norm(e) === norm(f.employmentType!))
  ) {
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
  } else if (f.minLanguageLevel) {
    // A level with no language selected used to be ignored entirely: the
    // control did nothing. Read it as "at this level in any language they
    // speak", which is the only sensible meaning on its own.
    const wanted = proficiencyRank(f.minLanguageLevel);
    const best = c.languages.reduce(
      (max, l) => Math.max(max, proficiencyRank(l.level)),
      -1,
    );
    if (best < wanted) return false;
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
  if (
    f.employmentType &&
    norm(job.employmentType) !== norm(f.employmentType)
  ) {
    return false;
  }

  // Show jobs whose top of range, as a monthly figure, clears the candidate's
  // floor. A job that states no salary is excluded for the same reason a
  // candidate with no stated expectation is: asking for "at least 6M" and being
  // shown listings with no salary at all is not an answer to the question.
  if (f.minSalary != null && f.minSalary > 0) {
    const top = toMonthlyIDR(job.salaryMax ?? job.salaryMin, job.salaryType);
    if (top == null || top < f.minSalary) return false;
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
