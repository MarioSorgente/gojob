import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "./types";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  verifySessionCookie: vi.fn(),
  userRead: vi.fn(),
}));

// React owns the real per-render dispatcher. Model that request boundary here
// so the unit test can exercise the exported cache wrapper without booting a
// Next.js server.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  let requestCache: Map<unknown, unknown> | undefined;

  return {
    ...react,
    cache:
      <T extends (...args: never[]) => unknown>(fn: T) =>
      (...args: Parameters<T>): ReturnType<T> => {
        if (!requestCache) return fn(...args) as ReturnType<T>;
        let values = requestCache.get(fn) as Map<string, ReturnType<T>>;
        if (!values) {
          values = new Map();
          requestCache.set(fn, values);
        }
        const key = JSON.stringify(args);
        if (!values.has(key)) values.set(key, fn(...args) as ReturnType<T>);
        return values.get(key) as ReturnType<T>;
      },
    __withRequest: async (work: () => Promise<void>) => {
      requestCache = new Map();
      try {
        await work();
      } finally {
        requestCache = undefined;
      }
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.token ? { value: mocks.token } : undefined),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("./firebase/admin", () => ({
  adminAuth: () => ({ verifySessionCookie: mocks.verifySessionCookie }),
  adminDb: () => ({
    collection: () => ({
      doc: (uid: string) => ({ get: () => mocks.userRead(uid) }),
    }),
  }),
}));

const { getSessionUser, requireRole } = await import("./auth");
const { __withRequest: runRequest } = (await import("react")) as unknown as {
  __withRequest(work: () => Promise<void>): Promise<void>;
};

const user = (uid: string, role: AppUser["role"] = "candidate"): AppUser => ({
  uid,
  email: `${uid}@example.com`,
  phone: null,
  role,
  displayName: uid,
  language: "en",
  onboardingComplete: true,
  createdAt: "2026-01-01T00:00:00.000Z",
});

beforeEach(() => {
  mocks.token = undefined;
  mocks.verifySessionCookie.mockReset();
  mocks.userRead.mockReset();
  mocks.verifySessionCookie.mockImplementation(async (token: string) => ({
    uid: token,
    email: `${token}@example.com`,
  }));
  mocks.userRead.mockImplementation(async (uid: string) => ({
    exists: true,
    data: () =>
      Object.fromEntries(
        Object.entries(user(uid)).filter(([key]) => key !== "uid"),
      ),
  }));
});

describe("request-scoped session caching", () => {
  it("shares cookie verification and the user read across auth helpers", async () => {
    mocks.token = "candidate-1";

    await runRequest(async () => {
      const [first, second, required] = await Promise.all([
        getSessionUser(),
        getSessionUser(),
        requireRole("candidate"),
      ]);
      expect(first).toEqual(user("candidate-1"));
      expect(second).toBe(first);
      expect(required).toBe(first);
    });

    expect(mocks.verifySessionCookie).toHaveBeenCalledTimes(1);
    expect(mocks.userRead).toHaveBeenCalledTimes(1);
    expect(mocks.userRead).toHaveBeenCalledWith("candidate-1");
  });

  it("does not share authentication state between requests", async () => {
    mocks.token = "candidate-1";
    await runRequest(async () => {
      expect((await getSessionUser())?.uid).toBe("candidate-1");
      expect((await requireRole("candidate")).uid).toBe("candidate-1");
    });

    mocks.token = "candidate-2";
    await runRequest(async () => {
      expect((await getSessionUser())?.uid).toBe("candidate-2");
      expect((await requireRole("candidate")).uid).toBe("candidate-2");
    });

    expect(mocks.verifySessionCookie).toHaveBeenCalledTimes(2);
    expect(mocks.userRead).toHaveBeenCalledTimes(2);
    expect(mocks.userRead.mock.calls).toEqual([
      ["candidate-1"],
      ["candidate-2"],
    ]);
  });
});
