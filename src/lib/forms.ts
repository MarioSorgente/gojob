/** Shared form payload shapes (client -> server actions). Types only. */

import type { ProficiencyLevel, SalaryType } from "./taxonomy";

export interface CandidateOnboardingInput {
  firstName: string;
  lastName: string;
  nationality: string;
  workEligibility: boolean;
  area: string;
  roles: string[];
  employmentTypes: string[];
  salary: { type: SalaryType; min: number | null; max: number | null };
  availability: { type: string; availableFrom: string | null };
  languages: { language: string; level: ProficiencyLevel }[];
  skills: { name: string }[];
  experiences: {
    companyName: string;
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
  }[];
}

export interface BusinessOnboardingInput {
  name: string;
  category: string;
  area: string;
  address: string;
  instagram: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  description: string;
}

export interface JobInput {
  role: string;
  area: string;
  employmentType: string;
  salaryType: SalaryType;
  salaryMin: number | null;
  salaryMax: number | null;
  minimumExperience: number;
  skills: { name: string; required: boolean }[];
  languages: { language: string; minimumLevel: ProficiencyLevel }[];
  desiredStartDate: string | null;
  description: string;
}
