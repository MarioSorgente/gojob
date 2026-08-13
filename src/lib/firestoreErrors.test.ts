import { describe, expect, it, vi } from "vitest";
import { isMissingIndexError, withIndexFallback } from "./firestoreErrors";

/**
 * A missing index took the whole candidate app down with a 500. These guard the
 * detection and the degradation, since this code only ever runs when something
 * is already wrong.
 */

/** Shaped like the real gRPC error Firestore throws. */
function firestoreIndexError() {
  return Object.assign(
    new Error(
      "9 FAILED_PRECONDITION: The query requires a COLLECTION_GROUP_ASC index " +
        "for collection shortlist and field candidateId.",
    ),
    { code: 9, details: "The query requires a COLLECTION_GROUP_ASC index" },
  );
}

describe("isMissingIndexError", () => {
  it("recognises the real Firestore error", () => {
    expect(isMissingIndexError(firestoreIndexError())).toBe(true);
  });

  it("recognises the composite-index variant", () => {
    expect(
      isMissingIndexError(
        Object.assign(new Error("9 FAILED_PRECONDITION: The query requires an index."), {
          code: 9,
        }),
      ),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isMissingIndexError(new Error("Conversation not found"))).toBe(false);
    expect(isMissingIndexError(Object.assign(new Error("nope"), { code: 7 }))).toBe(false);
    expect(isMissingIndexError(null)).toBe(false);
    expect(isMissingIndexError(undefined)).toBe(false);
    expect(isMissingIndexError("a string")).toBe(false);
  });
});

describe("withIndexFallback", () => {
  it("returns the fast path when it works, without touching the fallback", async () => {
    const fallback = vi.fn(async () => "slow");
    const result = await withIndexFallback("t", async () => "fast", fallback);

    expect(result).toBe("fast");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back when the index is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await withIndexFallback(
      "candidateEntries",
      async () => {
        throw firestoreIndexError();
      },
      async () => "slow",
    );

    expect(result).toBe("slow");
    // The log has to name the query, or a permanently missing index stays
    // invisible behind a working-but-slow app.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("candidateEntries"));
    warn.mockRestore();
  });

  it("rethrows anything that is not an index problem", async () => {
    // Turning real bugs into silent degradation would be worse than crashing.
    const fallback = vi.fn(async () => "slow");
    await expect(
      withIndexFallback(
        "t",
        async () => {
          throw new Error("Permission denied");
        },
        fallback,
      ),
    ).rejects.toThrow("Permission denied");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("lets a failure inside the fallback surface", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      withIndexFallback(
        "t",
        async () => {
          throw firestoreIndexError();
        },
        async () => {
          throw new Error("fallback broke too");
        },
      ),
    ).rejects.toThrow("fallback broke too");
    warn.mockRestore();
  });
});
