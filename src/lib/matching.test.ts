import { describe, expect, it } from "vitest";
import { computeMatch, type MatchCandidateInput, type MatchJobInput } from "./matching";

const baristaJob: MatchJobInput = {
  role: "Barista",
  area: "Canggu",
  salaryType: "Monthly",
  salaryMin: 6_000_000,
  salaryMax: 8_000_000,
  minimumExperience: 2,
  skills: [
    { name: "Espresso machine", required: true },
    { name: "Latte art", required: true },
    { name: "Manual brewing", required: false },
  ],
  languages: [{ language: "English", minimumLevel: "Conversational" }],
};

/** Ayu Pratiwi — the strong reference candidate from scope §23. */
const ayu: MatchCandidateInput = {
  roles: ["Barista"],
  area: "Canggu",
  salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
  availability: { type: "Available immediately" },
  languages: [
    { language: "Indonesian", level: "Native" },
    { language: "English", level: "Fluent" },
  ],
  skills: [
    { name: "Espresso machine" },
    { name: "Latte art" },
    { name: "Coffee calibration" },
    { name: "Manual brewing" },
  ],
  // Fixed 3-year span so the test is independent of the current date.
  experiences: [
    {
      role: "Barista",
      startDate: "2021-01-01",
      endDate: "2024-01-01",
      current: false,
    },
  ],
  profileStrength: 92,
};

describe("computeMatch", () => {
  it("scores a strong, on-role candidate very highly", () => {
    const result = computeMatch(baristaJob, ayu);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.breakdown.role).toBe(100);
    expect(result.breakdown.skills).toBe(100);
    expect(result.breakdown.salary).toBe(100);
    expect(result.breakdown.location).toBe(100);
  });

  it("produces explainable reasons", () => {
    const { reasons } = computeMatch(baristaJob, ayu);
    expect(reasons).toContain("✓ Barista");
    expect(reasons).toContain("✓ Salary within your budget");
    expect(reasons).toContain("✓ Located in Canggu");
    expect(reasons).toContain("✓ Available immediately");
    expect(reasons).toContain("✓ Your skills match");
    expect(reasons).toContain("✓ Required English level");
  });

  it("is deterministic for identical inputs", () => {
    expect(computeMatch(baristaJob, ayu)).toEqual(computeMatch(baristaJob, ayu));
  });

  it("penalizes a wrong-role candidate", () => {
    const waiter: MatchCandidateInput = {
      ...ayu,
      roles: ["Waiter / Waitress"],
      experiences: [
        {
          role: "Waiter / Waitress",
          startDate: "2022-01-01",
          endDate: "2024-01-01",
          current: false,
        },
      ],
      skills: [{ name: "POS" }, { name: "Table service" }],
    };
    const result = computeMatch(baristaJob, waiter);
    expect(result.breakdown.role).toBe(0);
    expect(result.score).toBeLessThan(computeMatch(baristaJob, ayu).score);
    expect(result.reasons).not.toContain("✓ Barista");
  });

  it("reduces the salary sub-score when the candidate expects above budget", () => {
    const pricey: MatchCandidateInput = {
      ...ayu,
      salary: { type: "Monthly", min: 12_000_000, max: 14_000_000 },
    };
    const result = computeMatch(baristaJob, pricey);
    // jobMax 8M / expected 12M = 0.667 -> 67
    expect(result.breakdown.salary).toBe(67);
    expect(result.reasons).not.toContain("✓ Salary within your budget");
  });

  it("gives partial location credit for a nearby area", () => {
    const nearby = computeMatch(baristaJob, { ...ayu, area: "Berawa" });
    expect(nearby.breakdown.location).toBe(70);
    expect(nearby.reasons).toContain("✓ Near Canggu (Berawa)");
  });

  it("does not penalize skills when the job lists none", () => {
    const noSkillJob: MatchJobInput = { ...baristaJob, skills: [] };
    expect(computeMatch(noSkillJob, ayu).breakdown.skills).toBe(100);
  });
});
