import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userDocument: { role: null as string | null },
  getSessionUser: vi.fn(),
  ensureUser: vi.fn(),
  setSelfServiceUserRole: vi.fn(async (_uid: string, role: string) => {
    mocks.userDocument.role = role;
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/repos/users", () => ({
  ensureUser: mocks.ensureUser,
  setSelfServiceUserRole: mocks.setSelfServiceUserRole,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { setRoleAction } from "./actions";

describe("setRoleAction", () => {
  beforeEach(() => {
    mocks.userDocument.role = null;
    mocks.getSessionUser.mockReset().mockResolvedValue({
      uid: "user-1",
      email: "user@example.com",
      phone: null,
      displayName: "Test User",
    });
    mocks.ensureUser.mockReset().mockResolvedValue(undefined);
    mocks.setSelfServiceUserRole.mockClear();
    mocks.redirect.mockClear();
  });

  it("rejects admin without changing the user document", async () => {
    // Server action arguments are untrusted at runtime even though TypeScript
    // prevents application code from making this call.
    // @ts-expect-error admin is intentionally outside the public input type
    await expect(setRoleAction("admin")).rejects.toThrow(
      "Invalid onboarding role",
    );

    expect(mocks.userDocument).toEqual({ role: null });
    expect(mocks.getSessionUser).not.toHaveBeenCalled();
    expect(mocks.ensureUser).not.toHaveBeenCalled();
    expect(mocks.setSelfServiceUserRole).not.toHaveBeenCalled();
  });

  it.each([
    ["candidate", "/candidate/onboarding"],
    ["employer", "/employer/onboarding"],
  ] as const)("assigns the %s role", async (role, destination) => {
    await expect(setRoleAction(role)).rejects.toThrow(
      `NEXT_REDIRECT:${destination}`,
    );

    expect(mocks.ensureUser).toHaveBeenCalledWith("user-1", {
      email: "user@example.com",
      phone: null,
      displayName: "Test User",
    });
    expect(mocks.setSelfServiceUserRole).toHaveBeenCalledWith("user-1", role);
    expect(mocks.userDocument).toEqual({ role });
  });
});
