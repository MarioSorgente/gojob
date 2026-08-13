import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  upsertCandidate: vi.fn(),
  setCandidateVerification: vi.fn(),
  markOnboardingComplete: vi.fn(),
  resync: vi.fn(),
  after: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/repos/candidates", () => ({
  upsertCandidate: mocks.upsertCandidate,
  setCandidateVerification: mocks.setCandidateVerification,
}));
vi.mock("@/lib/repos/users", () => ({
  markOnboardingComplete: mocks.markOnboardingComplete,
}));
vi.mock("@/lib/repos/rematch", () => ({
  resyncCandidateShortlistsQuietly: mocks.resync,
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveCandidateProfile } from "./actions";

const input = {
  firstName: " Jane ",
  lastName: " Doe ",
  nationality: "Cypriot",
  workEligibility: true,
  area: "Nicosia",
  roles: ["Chef"],
  employmentTypes: ["Full-time"],
  salary: { type: "Monthly" as const, min: 1000, max: 1500 },
  availability: { type: "Available immediately", availableFrom: null },
  languages: [],
  skills: [{ name: "Cooking" }],
  experiences: [],
};

describe("saveCandidateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ uid: "candidate-1", phone: null });
    mocks.upsertCandidate.mockResolvedValue({ userId: "candidate-1" });
    mocks.markOnboardingComplete.mockResolvedValue(undefined);
  });

  it("rejects a user with the wrong role before writing a profile", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT:/employer"));

    await expect(saveCandidateProfile(input)).rejects.toThrow(
      "NEXT_REDIRECT:/employer",
    );

    expect(mocks.requireRole).toHaveBeenCalledWith("candidate");
    expect(mocks.upsertCandidate).not.toHaveBeenCalled();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("can retry after the user update fails without creating another profile", async () => {
    mocks.markOnboardingComplete
      .mockRejectedValueOnce(new Error("user write failed"))
      .mockResolvedValueOnce(undefined);

    await expect(saveCandidateProfile(input)).rejects.toThrow(
      "user write failed",
    );
    await expect(saveCandidateProfile(input)).rejects.toThrow(
      "NEXT_REDIRECT:/candidate",
    );

    expect(mocks.upsertCandidate).toHaveBeenCalledTimes(2);
    expect(mocks.upsertCandidate).toHaveBeenNthCalledWith(
      1,
      "candidate-1",
      expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
    );
    expect(mocks.upsertCandidate).toHaveBeenNthCalledWith(
      2,
      "candidate-1",
      expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
    );
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(2);
  });
});
