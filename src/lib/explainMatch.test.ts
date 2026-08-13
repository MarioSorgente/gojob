import { describe, expect, it } from "vitest";
import { WEIGHTS, computeMatch, explainMatch } from "./matching";
import type { MatchCandidateInput, MatchJobInput } from "./matching";

/**
 * The explainer's headline promise is that the per-factor points add up to the
 * score shown on the pill. If that stops holding, the UI is quietly lying about
 * how the number was reached — which is the whole point of showing it.
 */

const job: MatchJobInput = {
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

function candidate(overrides: Partial<MatchCandidateInput> = {}): MatchCandidateInput {
  return {
    roles: ["Barista"],
    area: "Canggu",
    salary: { type: "Monthly", min: 6_500_000, max: 7_500_000 },
    availability: { type: "Available immediately" },
    languages: [{ language: "English", level: "Fluent" }],
    skills: [{ name: "Espresso machine" }, { name: "Latte art" }],
    experiences: [
      { role: "Barista", startDate: "2021-01-01", endDate: null, current: true },
    ],
    profileStrength: 80,
    ...overrides,
  };
}

/** Sum of the weights must be exactly 1, or the maths below is meaningless. */
describe("WEIGHTS", () => {
  it("sums to 1", () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("explainMatch", () => {
  it("returns one row per weighted factor", () => {
    const { breakdown } = computeMatch(job, candidate());
    const factors = explainMatch(breakdown);

    expect(factors.map((f) => f.key)).toEqual(Object.keys(WEIGHTS));
    expect(factors.every((f) => f.label.length > 0)).toBe(true);
  });

  it("caps each factor's points at its weight", () => {
    const { breakdown } = computeMatch(job, candidate());
    for (const f of explainMatch(breakdown)) {
      expect(f.points).toBeLessThanOrEqual(f.maxPoints + 0.001);
      expect(f.points).toBeGreaterThanOrEqual(0);
      expect(f.subScore).toBeGreaterThanOrEqual(0);
      expect(f.subScore).toBeLessThanOrEqual(100);
    }
  });

  it("max points across factors sum to 100", () => {
    const { breakdown } = computeMatch(job, candidate());
    const total = explainMatch(breakdown).reduce((sum, f) => sum + f.maxPoints, 0);
    expect(total).toBe(100);
  });

  // The important one.
  it.each([
    ["a strong match", candidate()],
    ["a weak match", candidate({ roles: ["Chef"], area: "Ubud", profileStrength: 10, skills: [], experiences: [] })],
    ["a partial match", candidate({ area: "Seminyak", salary: { type: "Monthly", min: 12_000_000, max: 15_000_000 } })],
    ["no availability signal", candidate({ availability: { type: "Custom date" } })],
    ["role only via past experience", candidate({ roles: ["Bartender"] })],
    ["an empty profile", candidate({ roles: [], skills: [], experiences: [], languages: [], profileStrength: 0 })],
  ])("points reconcile with the headline score for %s", (_label, c) => {
    const { score, breakdown } = computeMatch(job, c);
    const summed = explainMatch(breakdown).reduce((sum, f) => sum + f.points, 0);

    // Sub-scores are rounded before storage and the headline is rounded
    // separately, so the reconstruction lands within a point rather than
    // exactly. The bound is provable: per-factor error <= 0.5 x weight, weights
    // sum to 1, plus 0.5 for rounding the headline.
    expect(Math.abs(summed - score)).toBeLessThanOrEqual(1);
  });

  it("survives a breakdown with missing fields", () => {
    // Documents written before a factor existed would read as undefined.
    const partial = { role: 100, experience: 50 } as never;
    const factors = explainMatch(partial);
    expect(factors).toHaveLength(Object.keys(WEIGHTS).length);
    expect(factors.every((f) => Number.isFinite(f.points))).toBe(true);
  });
});
