import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeFirestore,
  type FakeFirestore,
} from "./testing/fakeFirestore";
import { computeProfileStrength } from "../profileStrength";
import type { CandidateProfile, Job, JobCandidate } from "../types";

/**
 * Integration coverage for the mutual-match state machine.
 *
 * Everything here goes through the real repo code against an in-memory
 * Firestore double, so it exercises the actual reads, merges and document
 * layout — not a reimplementation of the rules. This is the flow that had only
 * ever been verified by hand.
 */

let db: FakeFirestore;

// Hoisted so the module factory below can close over it before the repos load.
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

const {
  candidateApply,
  candidatePass,
  ensureShortlistEntry,
  getJobCandidate,
  getShortlist,
  getShortlistPage,
  listCandidateApplications,
  listCandidateInvitations,
  markHired,
  respondToInvitation,
  setEmployerAction,
} = await import("./pipeline");

const EMPLOYER = "employer-1";
const CANDIDATE = "cand-1";
const JOB_ID = "job-1";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: JOB_ID,
    businessId: "biz-1",
    ownerId: EMPLOYER,
    businessName: "Milk & Madu",
    businessVerified: true,
    role: "Barista",
    area: "Canggu",
    employmentType: "Full-time",
    salaryType: "Monthly",
    salaryMin: 6_000_000,
    salaryMax: 8_000_000,
    minimumExperience: 1,
    skills: [{ name: "Espresso machine", required: true }],
    languages: [{ language: "English", minimumLevel: "Conversational" }],
    desiredStartDate: null,
    description: "",
    status: "live",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCandidate(
  overrides: Partial<CandidateProfile> = {},
): CandidateProfile {
  const profile: CandidateProfile = {
    userId: CANDIDATE,
    firstName: "Ayu",
    lastName: "Pratiwi",
    photo: null,
    nationality: "Indonesian",
    workEligibility: true,
    area: "Canggu",
    roles: ["Barista"],
    employmentTypes: ["Full-time"],
    salary: { type: "Monthly", min: 6_000_000, max: 7_000_000 },
    availability: { type: "Available immediately", availableFrom: null },
    languages: [{ language: "English", level: "Fluent" }],
    skills: [{ name: "Espresso machine" }],
    experiences: [
      {
        id: "e1",
        companyName: "Revolver",
        role: "Barista",
        startDate: "2021-06-01",
        endDate: null,
        current: true,
        description: "",
        verificationStatus: "not_submitted",
      },
    ],
    profileStrength: 0,
    verification: {
      phone: "verified",
      id: "verified",
      employment: "not_submitted",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
  profile.profileStrength = computeProfileStrength(profile).percent;
  return profile;
}

async function seed(job = makeJob(), candidate = makeCandidate()) {
  db.docs.set(`jobs/${job.id}`, job as unknown as Record<string, unknown>);
  db.docs.set(
    `candidates/${candidate.userId}`,
    candidate as unknown as Record<string, unknown>,
  );
  return { job, candidate };
}

const entry = async (jobId = JOB_ID, candidateId = CANDIDATE) =>
  (await getJobCandidate(jobId, candidateId)) as JobCandidate;

beforeEach(() => {
  db = createFakeFirestore();
  dbRef.current = db;
});

describe("ensureShortlistEntry", () => {
  it("scores and creates a row that doesn't exist yet", async () => {
    await seed();
    const created = await ensureShortlistEntry(JOB_ID, CANDIDATE);

    expect(created.jobId).toBe(JOB_ID);
    expect(created.candidateId).toBe(CANDIDATE);
    expect(created.stage).toBe("recommended");
    expect(created.score).toBeGreaterThan(0);
    expect(created.candidateSummary.firstName).toBe("Ayu");
    expect(db.docs.has(`jobs/${JOB_ID}/shortlist/${CANDIDATE}`)).toBe(true);
  });

  it("returns the existing row untouched rather than resetting it", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "saved");

    const again = await ensureShortlistEntry(JOB_ID, CANDIDATE);
    expect(again.employerAction).toBe("saved");
  });

  it("refuses when the job or candidate is missing", async () => {
    await expect(ensureShortlistEntry("nope", CANDIDATE)).rejects.toThrow(
      "Job not found",
    );
    await seed();
    await expect(ensureShortlistEntry(JOB_ID, "ghost")).rejects.toThrow(
      "Candidate not found",
    );
  });
});

describe("candidateApply", () => {
  it("creates one consistently linked match when apply and invite race", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);

    await Promise.all([
      candidateApply(JOB_ID, CANDIDATE),
      setEmployerAction(JOB_ID, CANDIDATE, "invited"),
    ]);

    const matches = db.dump("matches");
    const conversations = db.dump("conversations");
    const row = await entry();
    expect(matches).toHaveLength(1);
    expect(conversations).toHaveLength(1);
    expect(row.stage).toBe("matched");
    expect(row.matchId).toBe(matches[0].id);
    expect(row.conversationId).toBe(conversations[0].id);
    expect(conversations[0].data.matchId).toBe(matches[0].id);
  });

  it("creates the row when the candidate was never shortlisted", async () => {
    // The regression: applying used to throw "Shortlist entry not found" for
    // anyone who registered after the job was posted — i.e. every visitor
    // arriving through a shared job link.
    await seed();
    const result = await candidateApply(JOB_ID, CANDIDATE);

    expect(result.matched).toBe(false);
    const row = await entry();
    expect(row.candidateAction).toBe("applied");
    expect(row.stage).toBe("applied");
    expect(row.candidateSummary).toBeDefined();
    expect(row.score).toBeGreaterThan(0);
  });

  it("matches immediately when the employer already invited", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "invited");

    const result = await candidateApply(JOB_ID, CANDIDATE);

    expect(result.matched).toBe(true);
    expect(result.matchId).toBeTruthy();
    expect(result.conversationId).toBeTruthy();

    const row = await entry();
    expect(row.stage).toBe("matched");
    expect(row.matchId).toBe(result.matchId);

    const conversation = db.docs.get(
      `conversations/${result.conversationId}`,
    ) as {
      participants: string[];
      unread: Record<string, number>;
    };
    expect(conversation.participants).toEqual([EMPLOYER, CANDIDATE]);
    expect(conversation.unread).toEqual({ [EMPLOYER]: 0, [CANDIDATE]: 0 });
    expect(db.docs.get(`userStats/${EMPLOYER}`)).toEqual({
      unreadConversationMessages: 0,
    });
    expect(db.docs.get(`userStats/${CANDIDATE}`)).toEqual({
      unreadConversationMessages: 0,
    });
    expect(db.dump("matches")).toHaveLength(1);
  });

  it("is idempotent — applying twice creates one match, not two", async () => {
    await seed();
    await setEmployerAction(
      JOB_ID,
      await ensureShortlistEntry(JOB_ID, CANDIDATE).then(() => CANDIDATE),
      "invited",
    );

    const first = await candidateApply(JOB_ID, CANDIDATE);
    const second = await candidateApply(JOB_ID, CANDIDATE);

    expect(second.matchId).toBe(first.matchId);
    expect(second.conversationId).toBe(first.conversationId);
    expect(db.dump("matches")).toHaveLength(1);
    expect(db.dump("conversations")).toHaveLength(1);
  });

  it("preserves a later stage instead of rewinding it to applied", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "invited");
    await candidateApply(JOB_ID, CANDIDATE);
    await markHired(JOB_ID, CANDIDATE);

    await candidateApply(JOB_ID, CANDIDATE);
    expect((await entry()).stage).toBe("hired");
  });
});

describe("candidatePass", () => {
  it("writes a complete row when none existed", async () => {
    // The second regression: this used to merge onto a missing document,
    // leaving a partial row with no jobId/score/candidateSummary that then
    // broke the applications list and the employer's shortlist rendering.
    await seed();
    await candidatePass(JOB_ID, CANDIDATE);

    const row = await entry();
    expect(row.jobId).toBe(JOB_ID);
    expect(row.candidateId).toBe(CANDIDATE);
    expect(row.businessId).toBe("biz-1");
    expect(row.candidateSummary).toBeDefined();
    expect(row.candidateAction).toBe("passed");
    expect(row.stage).toBe("rejected");
  });
});

describe("setEmployerAction", () => {
  beforeEach(async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
  });

  it("passing rejects the pair without matching", async () => {
    const result = await setEmployerAction(JOB_ID, CANDIDATE, "passed");
    expect(result.matched).toBe(false);
    const row = await entry();
    expect(row.employerAction).toBe("passed");
    expect(row.stage).toBe("rejected");
  });

  it("saving flags the row but leaves the stage alone", async () => {
    await setEmployerAction(JOB_ID, CANDIDATE, "saved");
    const row = await entry();
    expect(row.employerAction).toBe("saved");
    expect(row.stage).toBe("recommended");
  });

  it("inviting alone does not create a match", async () => {
    const result = await setEmployerAction(JOB_ID, CANDIDATE, "invited");
    expect(result.matched).toBe(false);
    expect(db.dump("matches")).toHaveLength(0);
    expect((await entry()).stage).toBe("recommended");
  });

  it("inviting after the candidate applied matches both sides", async () => {
    await candidateApply(JOB_ID, CANDIDATE);
    const result = await setEmployerAction(JOB_ID, CANDIDATE, "invited");

    expect(result.matched).toBe(true);
    expect((await entry()).stage).toBe("matched");
    expect(db.dump("conversations")).toHaveLength(1);
  });

  it("rejects an unknown pair", async () => {
    await expect(setEmployerAction(JOB_ID, "ghost", "invited")).rejects.toThrow(
      "Shortlist entry not found",
    );
  });

  it("unsaving returns the candidate to the recommended deck", async () => {
    await setEmployerAction(JOB_ID, CANDIDATE, "saved");
    await setEmployerAction(JOB_ID, CANDIDATE, "none");

    const row = await entry();
    // The deck filters on exactly these two fields.
    expect(row.employerAction).toBe("none");
    expect(row.stage).toBe("recommended");
  });

  it("un-passing restores the stage that passing changed", async () => {
    await setEmployerAction(JOB_ID, CANDIDATE, "passed");
    expect((await entry()).stage).toBe("rejected");

    await setEmployerAction(JOB_ID, CANDIDATE, "none");
    const row = await entry();
    expect(row.employerAction).toBe("none");
    expect(row.stage).toBe("recommended");
  });

  it("never resurrects a matched pair", async () => {
    await candidateApply(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "invited");
    expect((await entry()).stage).toBe("matched");

    await setEmployerAction(JOB_ID, CANDIDATE, "none");
    const row = await entry();
    expect(row.stage).toBe("matched");
    expect(row.matchId).toBeTruthy();
  });

  it("does not undo a rejection the candidate caused", async () => {
    // The candidate passed on the job; the employer clearing their own action
    // must not put the pair back in play.
    await candidatePass(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "none");
    expect((await entry()).stage).toBe("rejected");
  });
});

describe("invitations", () => {
  it("accepting an invitation matches", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "invited");

    const pending = await listCandidateInvitations(CANDIDATE);
    expect(pending).toHaveLength(1);
    expect(pending[0].job.id).toBe(JOB_ID);

    const result = await respondToInvitation(JOB_ID, CANDIDATE, true);
    expect(result.matched).toBe(true);
    expect(await listCandidateInvitations(CANDIDATE)).toHaveLength(0);
  });

  it("declining rejects the pair and clears the invitation", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await setEmployerAction(JOB_ID, CANDIDATE, "invited");

    const result = await respondToInvitation(JOB_ID, CANDIDATE, false);
    expect(result.matched).toBe(false);
    expect((await entry()).stage).toBe("rejected");
    expect(await listCandidateInvitations(CANDIDATE)).toHaveLength(0);
  });
});

describe("markHired", () => {
  it("records the hire and moves the pair to hired", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await markHired(JOB_ID, CANDIDATE);

    expect((await entry()).stage).toBe("hired");
    const hires = db.dump("hires");
    expect(hires).toHaveLength(1);
    expect(hires[0].data).toMatchObject({
      jobId: JOB_ID,
      candidateId: CANDIDATE,
      businessId: "biz-1",
    });
  });

  it("is idempotent across sequential retries and preserves the first timestamp", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-02-03T04:05:06.000Z"));
      await markHired(JOB_ID, CANDIDATE);
      vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
      await markHired(JOB_ID, CANDIDATE);
    } finally {
      vi.useRealTimers();
    }

    const hires = db.dump("hires");
    expect(hires).toHaveLength(1);
    expect(hires[0].data.createdAt).toBe("2026-02-03T04:05:06.000Z");
    expect(hires[0].data.date).toBe("2026-02-03");
    expect((await entry()).stage).toBe("hired");
  });

  it("creates one hire and consistently marks the shortlist when calls race", async () => {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);

    await Promise.all([
      markHired(JOB_ID, CANDIDATE),
      markHired(JOB_ID, CANDIDATE),
      markHired(JOB_ID, CANDIDATE),
    ]);

    expect(db.dump("hires")).toHaveLength(1);
    expect((await entry()).stage).toBe("hired");
  });
});

describe("candidate-facing queries", () => {
  it("lists applications across jobs via the collection group", async () => {
    const job2 = makeJob({ id: "job-2", role: "Barista" });
    await seed();
    db.docs.set(`jobs/${job2.id}`, job2 as unknown as Record<string, unknown>);

    await candidateApply(JOB_ID, CANDIDATE);
    await candidateApply("job-2", CANDIDATE);

    const applications = await listCandidateApplications(CANDIDATE);
    expect(applications.map((a) => a.job.id).sort()).toEqual([
      "job-1",
      "job-2",
    ]);
  });

  it("does not leak another candidate's rows", async () => {
    await seed();
    const other = makeCandidate({ userId: "cand-2", firstName: "Wayan" });
    db.docs.set(
      `candidates/${other.userId}`,
      other as unknown as Record<string, unknown>,
    );

    await candidateApply(JOB_ID, CANDIDATE);
    await candidateApply(JOB_ID, "cand-2");

    expect(await listCandidateApplications(CANDIDATE)).toHaveLength(1);
    expect(await getShortlist(JOB_ID)).toHaveLength(2);
  });

  it("ranks a job's shortlist highest score first", async () => {
    await seed();
    const weak = makeCandidate({
      userId: "cand-weak",
      area: "Ubud",
      roles: ["Barista"],
      skills: [],
      experiences: [],
      languages: [],
      verification: {
        phone: "not_submitted",
        id: "not_submitted",
        employment: "not_submitted",
      },
    });
    db.docs.set(
      `candidates/${weak.userId}`,
      weak as unknown as Record<string, unknown>,
    );

    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    await ensureShortlistEntry(JOB_ID, "cand-weak");

    const ranked = await getShortlist(JOB_ID);
    expect(ranked[0].candidateId).toBe(CANDIDATE);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

describe("getShortlistPage", () => {
  async function shortlistRows(rows: Array<{ id: string; score?: number }>) {
    await seed();
    await ensureShortlistEntry(JOB_ID, CANDIDATE);
    const template = db.docs.get(`jobs/${JOB_ID}/shortlist/${CANDIDATE}`)!;
    db.docs.delete(`jobs/${JOB_ID}/shortlist/${CANDIDATE}`);
    for (const row of rows) {
      const data = structuredClone(template);
      data.candidateId = row.id;
      if (row.score === undefined) delete data.score;
      else data.score = row.score;
      db.docs.set(`jobs/${JOB_ID}/shortlist/${row.id}`, data);
    }
  }

  it("orders by descending score and document id for equal scores", async () => {
    await shortlistRows([
      { id: "alpha", score: 80 },
      { id: "charlie", score: 80 },
      { id: "bravo", score: 95 },
    ]);
    const page = await getShortlistPage(JOB_ID, null, 10);
    expect(page.items.map((item) => item.candidateId)).toEqual([
      "bravo",
      "charlie",
      "alpha",
    ]);
  });

  it("continues at the page boundary without gaps or duplicates", async () => {
    await shortlistRows([
      { id: "a", score: 90 },
      { id: "b", score: 80 },
      { id: "c", score: 80 },
      { id: "d", score: 70 },
      { id: "e", score: 60 },
    ]);
    const first = await getShortlistPage(JOB_ID, null, 2);
    const second = await getShortlistPage(JOB_ID, first.nextCursor, 2);
    const third = await getShortlistPage(JOB_ID, second.nextCursor, 2);
    expect(first.items.map((item) => item.candidateId)).toEqual(["a", "c"]);
    expect(second.items.map((item) => item.candidateId)).toEqual(["b", "d"]);
    expect(third.items.map((item) => item.candidateId)).toEqual(["e"]);
    expect(third.nextCursor).toBeNull();
  });

  it("returns an empty terminal page", async () => {
    expect(await getShortlistPage(JOB_ID, null, 5)).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("repairs legacy rows with missing scores inside a bounded window", async () => {
    await shortlistRows([{ id: "legacy" }, { id: "scored", score: 50 }]);
    const page = await getShortlistPage(JOB_ID, null, 10);
    expect(page.items.map((item) => [item.candidateId, item.score])).toEqual([
      ["scored", 50],
      ["legacy", 0],
    ]);
    expect(db.docs.get(`jobs/${JOB_ID}/shortlist/legacy`)?.score).toBe(0);
  });
});
