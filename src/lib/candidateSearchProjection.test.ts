import { describe, expect, it, vi } from "vitest";
import {
  generateCandidateSearchProjection,
  hydrateCandidateSearchResults,
} from "./candidateSearchProjection";
import type { CandidateProfile } from "./types";

const candidate = (userId: string, firstName = "Current"): CandidateProfile => ({
  userId,
  firstName,
  lastName: "Name",
  photo: "current-photo.jpg",
  nationality: "Indonesian",
  workEligibility: true,
  area: "Berawa",
  roles: ["Barista"],
  employmentTypes: ["Full-time"],
  salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
  availability: { type: "Available immediately", availableFrom: null },
  languages: [{ language: "English", level: "Fluent" }],
  skills: [{ name: "Latte art" }],
  experiences: [{
    id: "e1", companyName: "Cafe", role: "Barista", startDate: "2021-01-01",
    endDate: "2024-01-01", current: false, description: "private notes",
    verificationStatus: "verified",
  }],
  profileStrength: 80,
  verification: { phone: "verified", id: "verified", employment: "verified" },
  idDocumentPath: "private/id.jpg",
  createdAt: "2024-01-01",
  updatedAt: "2026-08-13",
});

describe("candidate search service contract", () => {
  it("generates the versioned searchable projection without private source fields", () => {
    const projection = generateCandidateSearchProjection(candidate("c1"));

    expect(projection).toMatchObject({
      objectID: "c1", schemaVersion: 1, roles: ["Barista"], area: "Berawa",
      minimumSalary: 6_000_000, idVerified: true, experienceYears: 3,
      updatedAt: "2026-08-13",
    });
    expect(projection.searchText).toContain("Latte art");
    expect(projection).not.toHaveProperty("idDocumentPath");
    expect(projection).not.toHaveProperty("nationality");
    expect(projection).not.toHaveProperty("experiences");
  });

  it("authorizes before reading any authoritative profiles", async () => {
    const denied = new Error("forbidden");
    const load = vi.fn();

    await expect(
      hydrateCandidateSearchResults(
        [{ objectID: "c1" }],
        async () => { throw denied; },
        load,
      ),
    ).rejects.toBe(denied);
    expect(load).not.toHaveBeenCalled();
  });

  it("uses ordered hits only as ids and hydrates current Firestore fields", async () => {
    const load = vi.fn(async () => [candidate("c1", "Fresh"), candidate("c2", "Second")]);
    const hits = [
      { objectID: "c2", firstName: "STALE", photo: "stale.jpg" },
      { objectID: "deleted", firstName: "Ghost" },
      { objectID: "c1", firstName: "OLD" },
      { objectID: "c2", firstName: "duplicate" },
    ];

    const result = await hydrateCandidateSearchResults(hits, async () => {}, load);

    expect(load).toHaveBeenCalledWith(["c2", "deleted", "c1"]);
    expect(result.map(({ userId, firstName, photo }) => ({ userId, firstName, photo }))).toEqual([
      { userId: "c2", firstName: "Second", photo: "current-photo.jpg" },
      { userId: "c1", firstName: "Fresh", photo: "current-photo.jpg" },
    ]);
  });
});
