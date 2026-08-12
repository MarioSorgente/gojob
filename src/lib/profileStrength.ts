/**
 * Candidate profile strength (scope §4).
 *
 * A simple, encouraging completion score — never punitive. Verification lifts
 * the score but is not required to use GoJob. Weights sum to 100.
 */

import type { CandidateProfile } from "./types";

export interface StrengthItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface StrengthResult {
  percent: number; // 0..100
  items: StrengthItem[];
}

/** Fields the calculator needs — a structural subset of CandidateProfile. */
export type StrengthInput = Pick<
  CandidateProfile,
  | "photo"
  | "salary"
  | "availability"
  | "experiences"
  | "languages"
  | "verification"
>;

export function computeProfileStrength(profile: StrengthInput): StrengthResult {
  const hasSalary =
    profile.salary != null &&
    (profile.salary.min != null || profile.salary.max != null);
  const hasAvailability = Boolean(profile.availability?.type);

  const items: StrengthItem[] = [
    {
      key: "phone",
      label: "Phone verified",
      weight: 15,
      done: profile.verification?.phone === "verified",
    },
    {
      key: "salary",
      label: "Salary added",
      weight: 10,
      done: hasSalary,
    },
    {
      key: "availability",
      label: "Availability added",
      weight: 10,
      done: hasAvailability,
    },
    {
      key: "experience",
      label: "Experience added",
      weight: 15,
      done: (profile.experiences?.length ?? 0) > 0,
    },
    {
      key: "photo",
      label: "Profile picture",
      weight: 10,
      done: Boolean(profile.photo),
    },
    {
      key: "languages",
      label: "Languages added",
      weight: 15,
      done: (profile.languages?.length ?? 0) > 0,
    },
    {
      key: "id",
      label: "ID verified",
      weight: 15,
      done: profile.verification?.id === "verified",
    },
    {
      key: "employment",
      label: "Workplace verified",
      weight: 10,
      done: profile.verification?.employment === "verified",
    },
  ];

  const percent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { percent, items };
}
