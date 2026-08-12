import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFirestore, type FakeFirestore } from "./testing/fakeFirestore";
import { computeProfileStrength } from "../profileStrength";
import type { CandidateProfile, Job, JobCandidate } from "../types";

/**
 * Coverage for keeping shortlists current as candidate data changes.
 *
 * The behaviour worth pinning down is what happens to rows a candidate is no
 * longer eligible for: dropping one that carries pipeline state would silently
 * destroy a live conversation.
 */

let db: FakeFirestore;
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../firebase/admin", () => ({
  adminDb: () => dbRef.current,
  adminAuth: () => {
    throw new Error("not used in these tests");
  },
  adminStorage: () => {
    throw new Error("not used in these tests");
  },
}));

const { resyncCandidateShortlists } = await import("./rematch");
const { ensureShortlistEntry, setEmployerAction, candidateApply, getJobCandidate } =
  await import("./pipeline");

const CANDIDATE = "cand-1";

function makeJob(id: string, role: string, status: Job["status"] = "live"): Job {
  return {
    id,
    businessId: "biz-1",
    ownerId: "employer-1",
    businessName: "Milk & Madu",
    businessVerified: true,
    role,
    area: "Canggu",
    employmentType: "Full-time",
    salaryType: "Monthly",
    salaryMin: 6_000_000,
    salaryMax: 8_000_000,
    minimumExperience: 1,
    skills: [{ name: "Espresso machine", required: true }],
    languages: [],
    desiredStartDate: null,
    description: "",
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeCandidate(roles: string[]): CandidateProfile {
  const profile: CandidateProfile = {
    userId: CANDIDATE,
    firstName: "Ayu",
    lastName: "Pratiwi",
    photo: null,
    nationality: "Indonesian",
    workEligibility: true,
    area: "Canggu",
    roles,
    employmentTypes: ["Full-time"],
    salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
    availability: { type: "Available immediately", availableFrom: null },
    languages: [{ language: "English", level: "Fluent" }],
    skills: [{ name: "Espresso machine" }],
    experiences: [],
    profileStrength: 0,
    verification: { phone: "verified", id: "verified", employment: "not_submitted" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  profile.profileStrength = computeProfileStrength(profile).percent;
  return profile;
}

function putJob(job: Job) {
  db.docs.set(`jobs/${job.id}`, job as unknown as Record<string, unknown>);
}
function putCandidate(c: CandidateProfile) {
  db.docs.set(`candidates/${c.userId}`, c as unknown as Record<string, unknown>);
}

beforeEach(() => {
  db = createFakeFirestore();
  dbRef.current = db;
});

describe("resyncCandidateShortlists", () => {
  it("adds the candidate to live jobs posted before they joined", async () => {
    // The gap this closes: shortlists were built at publish time only, so a
    // candidate who signed up afterwards never appeared for existing jobs.
    putJob(makeJob("job-barista", "Barista"));
    putJob(makeJob("job-chef", "Chef"));
    const candidate = makeCandidate(["Barista"]);
    putCandidate(candidate);

    const result = await resyncCandidateShortlists(candidate);

    expect(result.upserted).toBe(1);
    expect(await getJobCandidate("job-barista", CANDIDATE)).not.toBeNull();
    expect(await getJobCandidate("job-chef", CANDIDATE)).toBeNull();
  });

  it("ignores jobs that aren't live", async () => {
    putJob(makeJob("job-closed", "Barista", "closed"));
    putJob(makeJob("job-draft", "Barista", "draft"));
    const candidate = makeCandidate(["Barista"]);
    putCandidate(candidate);

    expect((await resyncCandidateShortlists(candidate)).upserted).toBe(0);
  });

  it("covers every role the candidate wants", async () => {
    putJob(makeJob("job-barista", "Barista"));
    putJob(makeJob("job-bartender", "Bartender"));
    const candidate = makeCandidate(["Barista", "Bartender"]);
    putCandidate(candidate);

    expect((await resyncCandidateShortlists(candidate)).upserted).toBe(2);
  });

  it("refreshes the score and summary without disturbing pipeline state", async () => {
    putJob(makeJob("job-barista", "Barista"));
    const candidate = makeCandidate(["Barista"]);
    putCandidate(candidate);
    await ensureShortlistEntry("job-barista", CANDIDATE);
    await setEmployerAction("job-barista", CANDIDATE, "saved");

    const renamed = { ...candidate, firstName: "Ayu Updated" };
    putCandidate(renamed);
    await resyncCandidateShortlists(renamed);

    const row = (await getJobCandidate("job-barista", CANDIDATE)) as JobCandidate;
    expect(row.candidateSummary.firstName).toBe("Ayu Updated");
    expect(row.employerAction).toBe("saved");
  });

  it("drops untouched rows once a role is removed", async () => {
    putJob(makeJob("job-barista", "Barista"));
    putJob(makeJob("job-bartender", "Bartender"));
    const both = makeCandidate(["Barista", "Bartender"]);
    putCandidate(both);
    await resyncCandidateShortlists(both);

    const narrowed = makeCandidate(["Barista"]);
    putCandidate(narrowed);
    const result = await resyncCandidateShortlists(narrowed);

    expect(result.removed).toBe(1);
    expect(await getJobCandidate("job-bartender", CANDIDATE)).toBeNull();
    expect(await getJobCandidate("job-barista", CANDIDATE)).not.toBeNull();
  });

  it("keeps a row the candidate already applied to, even after removing the role", async () => {
    // Deleting this would destroy an in-flight application.
    putJob(makeJob("job-bartender", "Bartender"));
    const both = makeCandidate(["Barista", "Bartender"]);
    putCandidate(both);
    await candidateApply("job-bartender", CANDIDATE);

    const narrowed = makeCandidate(["Barista"]);
    putCandidate(narrowed);
    const result = await resyncCandidateShortlists(narrowed);

    expect(result.removed).toBe(0);
    const row = (await getJobCandidate("job-bartender", CANDIDATE)) as JobCandidate;
    expect(row.candidateAction).toBe("applied");
  });

  it("keeps a matched row after the role is removed", async () => {
    putJob(makeJob("job-bartender", "Bartender"));
    const both = makeCandidate(["Barista", "Bartender"]);
    putCandidate(both);
    await ensureShortlistEntry("job-bartender", CANDIDATE);
    await setEmployerAction("job-bartender", CANDIDATE, "invited");
    await candidateApply("job-bartender", CANDIDATE);

    const narrowed = makeCandidate(["Barista"]);
    putCandidate(narrowed);
    const result = await resyncCandidateShortlists(narrowed);

    expect(result.removed).toBe(0);
    const row = (await getJobCandidate("job-bartender", CANDIDATE)) as JobCandidate;
    expect(row.stage).toBe("matched");
    expect(row.conversationId).toBeTruthy();
  });

  it("does nothing for a candidate with no roles", async () => {
    putJob(makeJob("job-barista", "Barista"));
    const candidate = makeCandidate([]);
    putCandidate(candidate);

    const result = await resyncCandidateShortlists(candidate);
    expect(result).toEqual({ upserted: 0, removed: 0 });
  });

  it("is idempotent", async () => {
    putJob(makeJob("job-barista", "Barista"));
    const candidate = makeCandidate(["Barista"]);
    putCandidate(candidate);

    await resyncCandidateShortlists(candidate);
    const first = await getJobCandidate("job-barista", CANDIDATE);
    await resyncCandidateShortlists(candidate);
    const second = await getJobCandidate("job-barista", CANDIDATE);

    expect(second?.createdAt).toBe(first?.createdAt);
    expect(second?.score).toBe(first?.score);
  });
});
