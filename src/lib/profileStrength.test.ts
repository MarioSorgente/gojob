import { describe, expect, it } from "vitest";
import { computeProfileStrength, type StrengthInput } from "./profileStrength";

const empty: StrengthInput = {
  photo: null,
  salary: { type: "Monthly", min: null, max: null },
  availability: { type: "Available immediately", availableFrom: null },
  experiences: [],
  languages: [],
  verification: { phone: "not_submitted", id: "not_submitted", employment: "not_submitted" },
};

describe("computeProfileStrength", () => {
  it("credits only availability for a near-empty profile", () => {
    // availability has a type set in the fixture -> 10 points.
    const { percent } = computeProfileStrength(empty);
    expect(percent).toBe(10);
  });

  it("reaches 100 for a fully complete, fully verified profile", () => {
    const full: StrengthInput = {
      photo: "https://example.com/a.jpg",
      salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
      availability: { type: "Available immediately", availableFrom: null },
      experiences: [
        {
          id: "e1",
          companyName: "Revolver",
          role: "Barista",
          startDate: "2021-01-01",
          endDate: null,
          current: true,
          description: "",
          verificationStatus: "verified",
        },
      ],
      languages: [{ language: "English", level: "Fluent" }],
      verification: { phone: "verified", id: "verified", employment: "verified" },
    };
    expect(computeProfileStrength(full).percent).toBe(100);
  });

  it("sums the weights of completed items", () => {
    const partial: StrengthInput = {
      ...empty,
      salary: { type: "Monthly", min: 6_000_000, max: null }, // +10
      languages: [{ language: "English", level: "Fluent" }], // +15
      verification: { phone: "verified", id: "not_submitted", employment: "not_submitted" }, // +15
    };
    // availability 10 + salary 10 + languages 15 + phone 15 = 50
    expect(computeProfileStrength(partial).percent).toBe(50);
  });
});
