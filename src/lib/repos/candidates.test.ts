import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeFirestore,
  type FakeFirestore,
} from "./testing/fakeFirestore";
import type { CandidateSearchMetric } from "../candidateSearchMetrics";

vi.mock("server-only", () => ({}));
const dbRef = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("../firebase/admin", () => ({ adminDb: () => dbRef.current }));

const { normalizeCandidateFilters, searchCandidatesPage } =
  await import("./candidates");
const { setCandidateSearchMetricRecorder } =
  await import("../candidateSearchMetrics");

let db: FakeFirestore;
let metrics: CandidateSearchMetric[];

function candidate(id: string, strength: number, extra = {}) {
  db.docs.set(`candidates/${id}`, {
    userId: id,
    profileStrength: strength,
    roles: [Number(id) % 2 === 0 ? "Chef" : "Driver"],
    area: "North",
    ...extra,
  } as unknown as Record<string, unknown>);
}

beforeEach(() => {
  db = createFakeFirestore();
  dbRef.current = db;
  metrics = [];
  setCandidateSearchMetricRecorder((metric) => metrics.push(metric));
  delete process.env.CANDIDATE_SEARCH_FALLBACK_READ_BUDGET;
});

describe("candidate repository pagination", () => {
  it("normalizes defaults before deciding whether a residual predicate exists", () => {
    expect(
      normalizeCandidateFilters({
        role: " Chef ",
        area: " ",
        minExperience: 0,
        verifiedOnly: false,
      }),
    ).toEqual({ role: "Chef" });
  });

  it("reads only the page plus one for an unfiltered page", async () => {
    for (let i = 0; i < 30; i++) candidate(String(i).padStart(2, "0"), 100 - i);
    const page = await searchCandidatesPage({}, null, 20);
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).not.toBeNull();
    expect(metrics[0].documentsFetched).toBe(21);
    expect(metrics[0].fetchRounds).toBe(1);
  });

  it("supports role-only pages, subsequent cursors, equal strengths, and a short final page", async () => {
    for (let i = 0; i < 10; i++) candidate(String(i).padStart(2, "0"), 50);
    const first = await searchCandidatesPage({ role: "Chef" }, null, 3);
    const second = await searchCandidatesPage(
      { role: "Chef" },
      first.nextCursor,
      3,
    );
    expect(first.items.map((item) => item.userId)).toEqual(["08", "06", "04"]);
    expect(second.items.map((item) => item.userId)).toEqual(["02", "00"]);
    expect(second.nextCursor).toBeNull();
  });

  it("keeps filtered over-fetching for a genuine residual predicate", async () => {
    for (let i = 0; i < 30; i++)
      candidate(String(i).padStart(2, "0"), 100 - i, {
        area: i % 5 ? "South" : "North",
      });
    const page = await searchCandidatesPage({ area: "North" }, null, 4);
    expect(page.items).toHaveLength(4);
    expect(metrics[0].documentsFetched).toBe(16);
  });

  it("uses a bounded degraded fallback when an index is missing", async () => {
    for (let i = 0; i < 8; i++) candidate(String(i), i);
    process.env.CANDIDATE_SEARCH_FALLBACK_READ_BUDGET = "5";
    const real = db.collection.bind(db);
    dbRef.current = {
      collection(name: string) {
        const collection = real(name);
        return new Proxy(collection, {
          get(target, property, receiver) {
            if (property !== "orderBy")
              return Reflect.get(target, property, receiver);
            return () => {
              const broken = {
                orderBy: () => broken,
                startAfter: () => broken,
                limit: () => broken,
                get: async () => {
                  throw Object.assign(new Error("query requires an index"), {
                    code: 9,
                  });
                },
              };
              return broken;
            };
          },
        });
      },
    };
    const alert = vi.spyOn(console, "error").mockImplementation(() => {});
    const page = await searchCandidatesPage({}, null, 3);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
    expect(metrics[0]).toMatchObject({
      usedIndexFallback: true,
      fallbackBudgetExhausted: true,
      documentsFetched: 6,
    });
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("budget exhausted"),
    );
  });
});
