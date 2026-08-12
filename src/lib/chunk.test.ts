import { describe, expect, it } from "vitest";
import { BATCH_CHUNK_SIZE, FIRESTORE_BATCH_LIMIT, chunk } from "./chunk";

describe("chunk", () => {
  it("returns nothing for an empty list", () => {
    expect(chunk([])).toEqual([]);
  });

  it("keeps a short list in one group", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it("splits exactly on the boundary without an empty trailing group", () => {
    const groups = chunk([1, 2, 3, 4], 2);
    expect(groups).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("puts the remainder in a final short group", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("preserves order and loses nothing", () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const groups = chunk(items);
    expect(groups.flat()).toEqual(items);
  });

  it("never exceeds Firestore's batch limit at the default size", () => {
    // The bug this guards: a job matching >500 candidates threw on commit.
    const items = Array.from({ length: 1201 }, (_, i) => i);
    const groups = chunk(items);
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.length).toBeLessThanOrEqual(FIRESTORE_BATCH_LIMIT);
      expect(group.length).toBeLessThanOrEqual(BATCH_CHUNK_SIZE);
    }
  });

  it("leaves headroom under the hard limit for bookkeeping writes", () => {
    expect(BATCH_CHUNK_SIZE).toBeLessThan(FIRESTORE_BATCH_LIMIT);
  });

  it("rejects a nonsensical size rather than looping forever", () => {
    expect(() => chunk([1, 2], 0)).toThrow();
  });
});
