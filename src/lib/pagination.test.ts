import { describe, expect, it, vi } from "vitest";
import {
  MAX_FETCH_ROUNDS,
  decodeCursor,
  encodeCursor,
  paginateArray,
  paginateFiltered,
  type Page,
} from "./pagination";

describe("cursor encoding", () => {
  it("round-trips a value", () => {
    const cursor = encodeCursor({ strength: 80, id: "abc" });
    expect(decodeCursor<{ strength: number; id: string }>(cursor)).toEqual({
      strength: 80,
      id: "abc",
    });
  });

  it("is URL-safe", () => {
    const cursor = encodeCursor({ id: "a/b+c=d?e&f" });
    expect(cursor).toBe(encodeURIComponent(cursor));
  });

  it("treats a missing or tampered cursor as the start of the list", () => {
    // These arrive from the query string, so they must never throw.
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
    expect(decodeCursor(encodeCursor("a string, not an object"))).toBe(
      "a string, not an object",
    );
  });
});

describe("paginateArray", () => {
  const all = Array.from({ length: 25 }, (_, i) => i);

  it("returns the first page and a cursor", () => {
    const page = paginateArray(all, null, 10);
    expect(page.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(page.nextCursor).not.toBeNull();
  });

  it("walks the whole list without gaps or repeats", () => {
    const seen: number[] = [];
    let cursor: string | null = null;
    do {
      const page: Page<number> = paginateArray(all, cursor, 10);
      seen.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual(all);
  });

  it("ends with a null cursor on an exact boundary", () => {
    const exact = Array.from({ length: 20 }, (_, i) => i);
    const second = paginateArray(exact, paginateArray(exact, null, 10).nextCursor, 10);
    expect(second.items).toHaveLength(10);
    expect(second.nextCursor).toBeNull();
  });

  it("handles an empty list", () => {
    const page = paginateArray([], null, 10);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("ignores a malicious offset", () => {
    expect(paginateArray(all, encodeCursor({ offset: -5 }), 10).items[0]).toBe(0);
    expect(paginateArray(all, encodeCursor({ offset: 1e9 }), 10).items).toEqual([]);
    expect(paginateArray(all, encodeCursor({ offset: "nope" }), 10).items[0]).toBe(0);
  });
});

describe("paginateFiltered", () => {
  /** A fake source of `total` numbered items, paged by numeric cursor. */
  function source(total: number) {
    return vi.fn(async (after: string | null, limit: number) => {
      const start = after ? Number(after) + 1 : 0;
      return Array.from(
        { length: Math.max(0, Math.min(limit, total - start)) },
        (_, i) => start + i,
      );
    });
  }

  const opts = (fetchBatch: ReturnType<typeof source>, keep: (n: number) => boolean) => ({
    fetchBatch,
    keep,
    cursorOf: (n: number) => String(n),
    startCursor: null as string | null,
  });

  it("fills a page when everything passes the residual filter", async () => {
    const fetchBatch = source(100);
    const page = await paginateFiltered({ ...opts(fetchBatch, () => true), pageSize: 10 });
    expect(page.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(page.nextCursor).toBe("9");
  });

  it("keeps fetching until the page is full when the filter is selective", async () => {
    // Only 1 in 10 survives, so a single over-fetched batch isn't enough.
    const fetchBatch = source(1000);
    const page = await paginateFiltered({
      ...opts(fetchBatch, (n) => n % 10 === 0),
      pageSize: 10,
    });
    expect(page.items).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(fetchBatch.mock.calls.length).toBeGreaterThan(1);
  });

  it("returns a contiguous cursor so the next page doesn't skip items", async () => {
    const fetchBatch = source(100);
    const first = await paginateFiltered({ ...opts(fetchBatch, () => true), pageSize: 10 });
    const second = await paginateFiltered({
      ...opts(source(100), () => true),
      startCursor: first.nextCursor,
      pageSize: 10,
    });
    // The cursor points at the last item returned, not the last item read.
    expect(second.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it("signals the end of the list with a null cursor", async () => {
    const page = await paginateFiltered({ ...opts(source(5), () => true), pageSize: 10 });
    expect(page.items).toEqual([0, 1, 2, 3, 4]);
    expect(page.nextCursor).toBeNull();
  });

  it("bounds reads when the filter matches nothing", async () => {
    // The guard against a filter that matches nothing turning into a full scan.
    const fetchBatch = source(1_000_000);
    const page = await paginateFiltered({
      ...opts(fetchBatch, () => false),
      pageSize: 10,
    });
    expect(page.items).toEqual([]);
    expect(fetchBatch.mock.calls.length).toBeLessThanOrEqual(MAX_FETCH_ROUNDS);
  });

  it("handles an empty source", async () => {
    const page = await paginateFiltered({ ...opts(source(0), () => true), pageSize: 10 });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
