import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createBusiness: vi.fn(),
  getBusinessByOwner: vi.fn(),
  updateBusiness: vi.fn(),
  markOnboardingComplete: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/repos/businesses", () => ({
  createBusiness: mocks.createBusiness,
  getBusinessByOwner: mocks.getBusinessByOwner,
  updateBusiness: mocks.updateBusiness,
}));
vi.mock("@/lib/repos/users", () => ({
  markOnboardingComplete: mocks.markOnboardingComplete,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createBusinessAction } from "./actions";

const input = {
  name: " Cafe ",
  category: "Hospitality",
  area: "Limassol",
  address: " Main Street ",
  instagram: null,
  website: "https://cafe.example",
  googleMapsUrl: null,
  description: " Local cafe ",
};

describe("createBusinessAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ uid: "employer-1" });
    mocks.getBusinessByOwner.mockResolvedValue(null);
    mocks.createBusiness.mockResolvedValue({ id: "business-1" });
    mocks.updateBusiness.mockResolvedValue(undefined);
    mocks.markOnboardingComplete.mockResolvedValue(undefined);
  });

  it("rejects a user with the wrong role before reading or writing businesses", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT:/candidate"));

    await expect(createBusinessAction(input)).rejects.toThrow(
      "NEXT_REDIRECT:/candidate",
    );

    expect(mocks.requireRole).toHaveBeenCalledWith("employer");
    expect(mocks.getBusinessByOwner).not.toHaveBeenCalled();
    expect(mocks.createBusiness).not.toHaveBeenCalled();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("updates the saved business when retrying after the user update fails", async () => {
    let savedBusiness: { id: string } | null = null;
    mocks.getBusinessByOwner.mockImplementation(async () => savedBusiness);
    mocks.createBusiness.mockImplementation(async () => {
      savedBusiness = { id: "business-1" };
      return savedBusiness;
    });
    mocks.markOnboardingComplete
      .mockRejectedValueOnce(new Error("user write failed"))
      .mockResolvedValueOnce(undefined);

    await expect(createBusinessAction(input)).rejects.toThrow(
      "user write failed",
    );
    await expect(createBusinessAction(input)).rejects.toThrow(
      "NEXT_REDIRECT:/employer",
    );

    expect(mocks.createBusiness).toHaveBeenCalledTimes(1);
    expect(mocks.updateBusiness).toHaveBeenCalledOnce();
    expect(mocks.updateBusiness).toHaveBeenCalledWith(
      "business-1",
      expect.objectContaining({ name: "Cafe", address: "Main Street" }),
    );
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(2);
  });
});
