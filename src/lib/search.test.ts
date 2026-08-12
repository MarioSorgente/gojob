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
