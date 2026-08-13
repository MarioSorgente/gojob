import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeFirestore,
  type FakeFirestore,
} from "./testing/fakeFirestore";

let db: FakeFirestore;
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../firebase/admin", () => ({
  adminDb: () => dbRef.current,
}));

const { getMarketplaceMetrics } = await import("./admin");

beforeEach(() => {
  db = createFakeFirestore();
  dbRef.current = db;
});

function put(path: string, data: Record<string, unknown> = {}) {
  db.docs.set(path, data);
}

describe("getMarketplaceMetrics", () => {
  it("returns zeroes when the marketplace has no data", async () => {
    await expect(getMarketplaceMetrics()).resolves.toEqual({
      candidates: 0,
      employers: 0,
      businesses: 0,
      verifiedBusinesses: 0,
      jobs: 0,
      liveJobs: 0,
      applications: 0,
      invitations: 0,
      matches: 0,
      hires: 0,
      pendingIdVerifications: 0,
      pendingBusinessVerifications: 0,
      matchesPerLiveJob: 0,
    });
  });

  it("counts only documents matching each filtered metric", async () => {
    put("users/employer", { role: "employer" });
    put("users/candidate", { role: "candidate" });
    put("candidates/pending", { verification: { id: "pending" } });
    put("candidates/verified", { verification: { id: "verified" } });
    put("businesses/verified", { verificationStatus: "verified" });
    put("businesses/pending", { verificationStatus: "pending" });
    put("businesses/rejected", { verificationStatus: "rejected" });
    put("jobs/live", { status: "live" });
    put("jobs/closed", { status: "closed" });
    put("jobs/live/shortlist/applied", { candidateAction: "applied" });
    put("jobs/live/shortlist/invited", { employerAction: "invited" });
    put("jobs/closed/shortlist/other", {
      candidateAction: "passed",
      employerAction: "saved",
    });
    put("matches/m1");
    put("hires/h1");

    await expect(getMarketplaceMetrics()).resolves.toEqual({
      candidates: 2,
      employers: 1,
      businesses: 3,
      verifiedBusinesses: 1,
      jobs: 2,
      liveJobs: 1,
      applications: 1,
      invitations: 1,
      matches: 1,
      hires: 1,
      pendingIdVerifications: 1,
      pendingBusinessVerifications: 1,
      matchesPerLiveJob: 1,
    });
  });

  it("derives the ratio from aggregate counts and rounds to one decimal", async () => {
    put("jobs/j1", { status: "live" });
    put("jobs/j2", { status: "live" });
    put("jobs/j3", { status: "live" });
    put("matches/m1");
    put("matches/m2");

    expect((await getMarketplaceMetrics()).matchesPerLiveJob).toBe(0.7);
  });

  it("does not divide by zero when matches exist without a live job", async () => {
    put("jobs/closed", { status: "closed" });
    put("matches/m1");

    const metrics = await getMarketplaceMetrics();
    expect(metrics.matches).toBe(1);
    expect(metrics.liveJobs).toBe(0);
    expect(metrics.matchesPerLiveJob).toBe(0);
  });
});
