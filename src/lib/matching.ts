/**
 * GoJob deterministic matching engine (scope §9).
 *
 * NO LLM. A transparent, explainable weighted formula:
 *
 *   30% role · 20% experience · 15% skills · 10% salary
 *   10% location · 10% availability · 5% profile strength
 *
 * Each sub-score is normalized to 0..1, weighted, summed, and scaled to 0..100.
 * The engine also returns a human-readable `reasons` list so employers see
 * exactly *why* a candidate ranks where they do.
 *
 * Inputs are structurally-typed subsets of Job / CandidateProfile, so callers
 * can pass full domain objects directly.
 */

import type { MatchBreakdown } from "./types";
import {
  areasAreNearby,
  proficiencyRank,
  type AvailabilityType,
  type ProficiencyLevel,
  type SalaryType,
} from "./taxonomy";

export const WEIGHTS = {
  role: 0.3,
  experience: 0.2,
  skills: 0.15,
  salary: 0.1,
  location: 0.1,
  availability: 0.1,
  profileStrength: 0.05,
} as const;

export interface MatchJobInput {
  role: string;
  area: string;
  salaryType: SalaryType;
  salaryMin: number | null;
  salaryMax: number | null;
  minimumExperience: number;
  skills: { name: string; required: boolean }[];
  languages: { language: string; minimumLevel: ProficiencyLevel }[];
}

export interface MatchCandidateInput {
  roles: string[];
  area: string;
  salary: { type: SalaryType; min: number | null; max: number | null };
  availability: { type: AvailabilityType | string };
  languages: { language: string; level: ProficiencyLevel }[];
  skills: { name: string }[];
  experiences: {
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }[];
  profileStrength: number;
}

export interface MatchResult {
  score: number; // 0..100
  breakdown: MatchBreakdown;
  reasons: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const norm = (s: string) => s.trim().toLowerCase();
const pct = (n: number) => Math.round(clamp01(n) * 100);

/** Fractional years between two ISO dates (end defaults to now). */
function yearsBetween(
  startISO: string,
  endISO: string | null,
  current: boolean,
): number {
  const start = new Date(startISO).getTime();
  if (Number.isNaN(start)) return 0;
  const endRaw = current || !endISO ? Date.now() : new Date(endISO).getTime();
  const end = Number.isNaN(endRaw) ? Date.now() : endRaw;
  if (end <= start) return 0;
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}

interface ExperienceYears {
  relevant: number;
  total: number;
}

function experienceYears(
  experiences: MatchCandidateInput["experiences"],
  role: string,
): ExperienceYears {
  let relevant = 0;
  let total = 0;
  for (const exp of experiences) {
    const yrs = yearsBetween(exp.startDate, exp.endDate, exp.current);
    total += yrs;
    if (norm(exp.role) === norm(role)) relevant += yrs;
  }
  return { relevant, total };
}

function availabilityScore(type: string): number {
  switch (type) {
    case "Available immediately":
      return 1;
    case "Available within 7 days":
      return 0.85;
    case "Available within 14 days":
      return 0.7;
    case "Available within 30 days":
      return 0.5;
    case "Custom date":
      return 0.6;
    default:
      return 0.5;
  }
}

/** Whether the candidate meets every language requirement on the job. */
function languagesMet(
  job: MatchJobInput,
  candidate: MatchCandidateInput,
): { met: boolean; firstLanguage: string | null } {
  if (job.languages.length === 0) return { met: true, firstLanguage: null };
  let met = true;
  for (const req of job.languages) {
    const held = candidate.languages.find(
      (l) => norm(l.language) === norm(req.language),
    );
    if (!held || proficiencyRank(held.level) < proficiencyRank(req.minimumLevel)) {
      met = false;
    }
  }
  return { met, firstLanguage: job.languages[0]?.language ?? null };
}

export function computeMatch(
  job: MatchJobInput,
  candidate: MatchCandidateInput,
): MatchResult {
  const reasons: string[] = [];

  // --- Role (30%) ---
  const roleExact = candidate.roles.some((r) => norm(r) === norm(job.role));
  const roleInExperience = candidate.experiences.some(
    (e) => norm(e.role) === norm(job.role),
  );
  const roleScore = roleExact ? 1 : roleInExperience ? 0.6 : 0;
  if (roleExact) reasons.push(`✓ ${job.role}`);

  // --- Experience (20%) ---
  const { relevant, total } = experienceYears(candidate.experiences, job.role);
  const effectiveYears = relevant > 0 ? relevant : total * 0.6;
  const target = job.minimumExperience > 0 ? job.minimumExperience : 2;
  const experienceScore = clamp01(effectiveYears / target);
  if (effectiveYears > 0 && experienceScore >= 0.999) {
    const yrs = Math.max(1, Math.round(relevant > 0 ? relevant : total));
    reasons.push(`✓ ${yrs} year${yrs === 1 ? "" : "s"} experience`);
  }

  // --- Skills (15%) ---
  const candSkillNames = new Set(candidate.skills.map((s) => norm(s.name)));
  const required = job.skills.filter((s) => s.required).map((s) => norm(s.name));
  const preferred = job.skills.filter((s) => !s.required).map((s) => norm(s.name));
  const matchedReq = required.filter((s) => candSkillNames.has(s)).length;
  const matchedPref = preferred.filter((s) => candSkillNames.has(s)).length;
  const reqScore = required.length ? matchedReq / required.length : 1;
  const prefScore = preferred.length ? matchedPref / preferred.length : 1;
  let skillScore: number;
  if (required.length && preferred.length) {
    skillScore = 0.8 * reqScore + 0.2 * prefScore;
  } else if (required.length) {
    skillScore = reqScore;
  } else if (preferred.length) {
    skillScore = prefScore;
  } else {
    skillScore = 1; // job listed no skills — don't penalize
  }
  const totalMatchedSkills = matchedReq + matchedPref;
  if ((required.length || preferred.length) && totalMatchedSkills > 0) {
    reasons.push(
      skillScore >= 0.999
        ? "✓ Your skills match"
        : `✓ ${totalMatchedSkills} matching skill${totalMatchedSkills === 1 ? "" : "s"}`,
    );
  }

  // --- Salary (10%) ---
  let salaryScore: number;
  const sameSalaryType = candidate.salary.type === job.salaryType;
  const candExpected = candidate.salary.min;
  const jobMax = job.salaryMax;
  if (!sameSalaryType || jobMax == null || candExpected == null) {
    salaryScore = 0.6; // insufficient/incompatible data — neutral
  } else if (candExpected <= jobMax) {
    salaryScore = 1;
    reasons.push("✓ Salary within your budget");
  } else {
    salaryScore = clamp01(jobMax / candExpected);
  }

  // --- Location (10%) ---
  let locationScore: number;
  if (norm(candidate.area) === norm(job.area)) {
    locationScore = 1;
    reasons.push(`✓ Located in ${candidate.area}`);
  } else if (areasAreNearby(candidate.area, job.area)) {
    locationScore = 0.7;
    reasons.push(`✓ Near ${job.area} (${candidate.area})`);
  } else {
    locationScore = 0.3;
  }

  // --- Availability (10%) ---
  const availScore = availabilityScore(candidate.availability.type);
  if (availScore >= 0.85) reasons.push(`✓ ${candidate.availability.type}`);

  // --- Profile strength (5%) ---
  const profileScore = clamp01(candidate.profileStrength / 100);

  // --- Languages (not weighted; surfaced as a reason) ---
  const lang = languagesMet(job, candidate);
  if (lang.met && lang.firstLanguage) {
    reasons.push(`✓ Required ${lang.firstLanguage} level`);
  }

  const score =
    WEIGHTS.role * roleScore +
    WEIGHTS.experience * experienceScore +
    WEIGHTS.skills * skillScore +
    WEIGHTS.salary * salaryScore +
    WEIGHTS.location * locationScore +
    WEIGHTS.availability * availScore +
    WEIGHTS.profileStrength * profileScore;

  return {
    score: Math.round(clamp01(score) * 100),
    breakdown: {
      role: pct(roleScore),
      experience: pct(experienceScore),
      skills: pct(skillScore),
      salary: pct(salaryScore),
      location: pct(locationScore),
      availability: pct(availScore),
      profileStrength: pct(profileScore),
    },
    reasons,
  };
}
