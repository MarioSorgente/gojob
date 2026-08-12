import { describe, expect, it } from "vitest";
import {
  AYU,
  DEMO_CHAT,
  MILK_MADU_JOBS,
  OTHER_CANDIDATES,
  PRE_APPLIED_JOB_ID,
  PRE_APPLIED_UIDS,
  REVOLVER_JOB,
  SEED_PREFIX,
  buildCandidate,
  poolUid,
  toSummary,
} from "./data";

/**
 * These guard the seed fixture's internal consistency. The seeding itself needs
 * Firestore, but every mistake worth catching here is a data mistake — a
 * pre-applied candidate who isn't in the job's role pool, a chat pointing at a
 * job that doesn't exist, an id that reset() would miss.
 */

const pool = OTHER_CANDIDATES.map((seed, i) =>
  buildCandidate({ uid: poolUid(i + 1), ...seed }),
);

describe("demo fixture", () => {
  it("gives every seeded document a removable prefix", () => {
    // reset() finds seeded data by this prefix; an unprefixed id would survive.
    for (const { id } of MILK_MADU_JOBS) expect(id.startsWith(SEED_PREFIX)).toBe(true);
    for (let i = 1; i <= OTHER_CANDIDATES.length; i++) {
      expect(poolUid(i).startsWith(SEED_PREFIX)).toBe(true);
    }
    expect(DEMO_CHAT.matchId.startsWith(SEED_PREFIX)).toBe(true);
    expect(DEMO_CHAT.conversationId.startsWith(SEED_PREFIX)).toBe(true);
  });

  it("points the pre-staged chat at a job that is actually seeded", () => {
    const ids = MILK_MADU_JOBS.map((j) => j.id);
    expect(ids).toContain(DEMO_CHAT.jobId);
    expect(ids).toContain(PRE_APPLIED_JOB_ID);
  });

  it("only pre-applies candidates who land in that job's shortlist", () => {
    // The shortlist is built from candidates whose roles include the job role,
    // so a non-Barista here would silently never appear as an applicant.
    const job = MILK_MADU_JOBS.find((j) => j.id === PRE_APPLIED_JOB_ID);
    expect(job).toBeDefined();

    for (const uid of PRE_APPLIED_UIDS) {
      const candidate = pool.find((c) => c.userId === uid);
      expect(candidate, `${uid} is not in the candidate pool`).toBeDefined();
      expect(
        candidate!.roles.some(
          (r) => r.toLowerCase() === job!.job.role.toLowerCase(),
        ),
        `${uid} does not want the ${job!.job.role} role`,
      ).toBe(true);
    }
  });

  it("covers every seeded job role with at least one candidate", () => {
    const all = [buildCandidate({ uid: "ayu", ...AYU }), ...pool];
    const roles = [...MILK_MADU_JOBS.map((j) => j.job.role), REVOLVER_JOB.role];

    for (const role of roles) {
      const matching = all.filter((c) =>
        c.roles.some((r) => r.toLowerCase() === role.toLowerCase()),
      );
      expect(matching.length, `no candidates want the ${role} role`).toBeGreaterThan(0);
    }
  });

  it("stocks all three admin verification queues", () => {
    expect(pool.filter((c) => c.verification.id === "pending").length).toBeGreaterThan(0);
    expect(
      pool.filter((c) => c.verification.employment === "pending").length,
    ).toBeGreaterThan(0);
    // The pending business is asserted via SUNSET_WARUNG's status in data.ts.
  });

  it("attaches a document path to every pending ID so review isn't blind", () => {
    for (const c of pool.filter((x) => x.verification.id === "pending")) {
      expect(c.idDocumentPath, `${c.userId} has no idDocumentPath`).toBeTruthy();
    }
  });

  it("derives a usable summary for shortlist cards", () => {
    const ayu = buildCandidate({ uid: "ayu", ...AYU });
    const summary = toSummary(ayu);
    expect(summary.primaryRole).toBe("Barista");
    expect(summary.yearsExperience).toBeGreaterThan(0);
    expect(ayu.profileStrength).toBeGreaterThan(0);
    expect(ayu.profileStrength).toBeLessThanOrEqual(100);
  });

  it("never leaves undefined on a candidate document", () => {
    // Firestore rejects undefined values; null is required instead.
    for (const c of pool) {
      for (const [key, value] of Object.entries(c)) {
        expect(value, `${c.userId}.${key} is undefined`).not.toBeUndefined();
      }
    }
  });
});
