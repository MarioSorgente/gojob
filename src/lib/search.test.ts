import { describe, expect, it } from "vitest";
import { candidateMatchesFilters, jobMatchesFilters } from "./search";
import type { CandidateProfile, Job } from "./types";

const candidate: CandidateProfile = {
  userId: "c1",
  firstName: "Ayu",
  lastName: "Pratiwi",
  photo: null,
  nationality: "Indonesian",
  workEligibility: true,
  area: "Berawa",
  roles: ["Barista"],
  employmentTypes: ["Full-time"],
  salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
  availability: { type: "Available immediately", availableFrom: null },
  languages: [
    { language: "Indonesian", level: "Native" },
    { language: "English", level: "Fluent" },
  ],
  skills: [{ name: "Latte art" }],
  experiences: [
    {
      id: "e1",
      companyName: "Revolver",
      role: "Barista",
      startDate: "2021-01-01",
      endDate: "2024-01-01",
      current: false,
      description: "",
      verificationStatus: "not_submitted",
    },
  ],
  profileStrength: 80,
  verification: { phone: "verified", id: "verified", employment: "not_submitted" },
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const job: Job = {
  id: "j1",
  businessId: "b1",
  ownerId: "o1",
  businessName: "Milk & Madu",
  businessVerified: true,
  role: "Barista",
  area: "Canggu",
  employmentType: "Full-time",
  salaryType: "Monthly",
  salaryMin: 6_000_000,
  salaryMax: 8_000_000,
  minimumExperience: 2,
  skills: [{ name: "Latte art", required: true }],
  languages: [{ language: "English", minimumLevel: "Conversational" }],
  desiredStartDate: null,
  description: "Great café in Canggu",
  status: "live",
  createdAt: "2024-01-01",
};

describe("candidateMatchesFilters", () => {
  it("matches with no filters", () => {
    expect(candidateMatchesFilters(candidate, {})).toBe(true);
  });

  it("filters by area", () => {
    expect(candidateMatchesFilters(candidate, { area: "Berawa" })).toBe(true);
    expect(candidateMatchesFilters(candidate, { area: "Ubud" })).toBe(false);
  });

  it("filters by minimum experience", () => {
    expect(candidateMatchesFilters(candidate, { minExperience: 3 })).toBe(true);
    expect(candidateMatchesFilters(candidate, { minExperience: 10 })).toBe(false);
  });

  it("excludes candidates who expect more than the budget", () => {
    expect(candidateMatchesFilters(candidate, { maxSalary: 7_000_000 })).toBe(true);
    expect(candidateMatchesFilters(candidate, { maxSalary: 5_000_000 })).toBe(false);
  });

  it("filters by language and minimum level", () => {
    expect(
      candidateMatchesFilters(candidate, {
        language: "English",
        minLanguageLevel: "Conversational",
      }),
    ).toBe(true);
    expect(
      candidateMatchesFilters(candidate, {
        language: "English",
        minLanguageLevel: "Native",
      }),
    ).toBe(false);
    expect(candidateMatchesFilters(candidate, { language: "French" })).toBe(false);
  });

  it("filters by verification", () => {
    expect(candidateMatchesFilters(candidate, { verifiedOnly: true })).toBe(true);
    const unverified = {
      ...candidate,
      verification: { ...candidate.verification, id: "not_submitted" as const },
    };
    expect(candidateMatchesFilters(unverified, { verifiedOnly: true })).toBe(false);
  });

  it("searches across name, skills and past venues", () => {
    expect(candidateMatchesFilters(candidate, { query: "ayu" })).toBe(true);
    expect(candidateMatchesFilters(candidate, { query: "latte" })).toBe(true);
    expect(candidateMatchesFilters(candidate, { query: "revolver" })).toBe(true);
    expect(candidateMatchesFilters(candidate, { query: "sushi" })).toBe(false);
  });
});

describe("jobMatchesFilters", () => {
  it("matches with no filters", () => {
    expect(jobMatchesFilters(job, {})).toBe(true);
  });

  it("filters by role, area and employment type", () => {
    expect(jobMatchesFilters(job, { role: "Barista" })).toBe(true);
    expect(jobMatchesFilters(job, { role: "Chef" })).toBe(false);
    expect(jobMatchesFilters(job, { area: "Canggu" })).toBe(true);
    expect(jobMatchesFilters(job, { area: "Ubud" })).toBe(false);
    expect(jobMatchesFilters(job, { employmentType: "Part-time" })).toBe(false);
  });

  it("keeps jobs whose top salary clears the candidate's floor", () => {
    expect(jobMatchesFilters(job, { minSalary: 7_000_000 })).toBe(true);
    expect(jobMatchesFilters(job, { minSalary: 9_000_000 })).toBe(false);
  });

  it("searches role, venue and description", () => {
    expect(jobMatchesFilters(job, { query: "madu" })).toBe(true);
    expect(jobMatchesFilters(job, { query: "café" })).toBe(true);
    expect(jobMatchesFilters(job, { query: "dishwasher" })).toBe(false);
  });
});

/**
 * Salary filtering was wrong in three ways at once, all of which showed up as
 * "I set a maximum salary and it still lists everyone".
 */
describe("salary filters", () => {
  const withSalary = (
    type: string,
    min: number | null,
    max: number | null,
  ): CandidateProfile => ({
    ...candidate,
    salary: { type: type as CandidateProfile["salary"]["type"], min, max },
  });

  it("excludes a candidate who has stated no expectation", () => {
    // Was included: the comparison was skipped when the figure was missing, so
    // a cap silently kept everyone it could not verify.
    const unstated = withSalary("Monthly", null, null);
    expect(candidateMatchesFilters(unstated, { maxSalary: 5_000_000 })).toBe(false);
    // With no cap they are still a perfectly good result.
    expect(candidateMatchesFilters(unstated, {})).toBe(true);
  });

  it("falls back to the top of the range when no minimum is stated", () => {
    const openEnded = withSalary("Monthly", null, 20_000_000);
    expect(candidateMatchesFilters(openEnded, { maxSalary: 8_000_000 })).toBe(false);
    expect(candidateMatchesFilters(openEnded, { maxSalary: 25_000_000 })).toBe(true);
  });

  it("compares daily and hourly rates as monthly equivalents", () => {
    // 500k/day is ~13M a month. Against an 8M monthly budget it used to look
    // cheaper than the cap and was returned as a match.
    const daily = withSalary("Daily", 500_000, null);
    expect(candidateMatchesFilters(daily, { maxSalary: 8_000_000 })).toBe(false);
    expect(candidateMatchesFilters(daily, { maxSalary: 15_000_000 })).toBe(true);

    const hourly = withSalary("Hourly", 100_000, null); // ~20.8M a month
    expect(candidateMatchesFilters(hourly, { maxSalary: 8_000_000 })).toBe(false);
  });

  it("excludes jobs that state no salary from a minimum-salary search", () => {
    const noSalary: Job = { ...job, salaryMin: null, salaryMax: null };
    expect(jobMatchesFilters(noSalary, { minSalary: 6_000_000 })).toBe(false);
    expect(jobMatchesFilters(noSalary, {})).toBe(true);
  });

  it("compares job rates as monthly equivalents too", () => {
    const dailyJob: Job = {
      ...job,
      salaryType: "Daily",
      salaryMin: 300_000,
      salaryMax: 400_000,
    };
    // ~10.4M a month, so it clears a 9M floor and misses a 12M one.
    expect(jobMatchesFilters(dailyJob, { minSalary: 9_000_000 })).toBe(true);
    expect(jobMatchesFilters(dailyJob, { minSalary: 12_000_000 })).toBe(false);
  });
});

describe("language level without a language", () => {
  it("reads a level on its own as 'in any language they speak'", () => {
    // The control used to do nothing at all unless a language was also picked.
    expect(candidateMatchesFilters(candidate, { minLanguageLevel: "Fluent" })).toBe(true);
    const basicOnly: CandidateProfile = {
      ...candidate,
      languages: [{ language: "Indonesian", level: "Basic" }],
    };
    expect(candidateMatchesFilters(basicOnly, { minLanguageLevel: "Fluent" })).toBe(false);
  });
});

describe("filters ignore casing differences", () => {
  it("matches employment type and availability regardless of case", () => {
    expect(candidateMatchesFilters(candidate, { employmentType: "full-time" })).toBe(true);
    expect(
      candidateMatchesFilters(candidate, { availability: "available immediately" }),
    ).toBe(true);
    expect(jobMatchesFilters(job, { employmentType: "FULL-TIME" })).toBe(true);
  });
});
