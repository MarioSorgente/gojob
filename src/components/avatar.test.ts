import { describe, expect, it } from "vitest";

/**
 * `Avatar` derives initials from a name that comes from a denormalized
 * Firestore field. Those fields are typed but never validated at runtime, so a
 * document written before the field existed — or a partial write — hands the
 * component `undefined`. `undefined.split()` threw and, because the chats list
 * renders on the server, took the whole page to the error boundary.
 *
 * This is the exact expression the component uses.
 */
function initialsOf(name: string | null | undefined): string {
  return (name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

describe("Avatar initials", () => {
  it("survives a missing name instead of throwing", () => {
    expect(() => initialsOf(undefined)).not.toThrow();
    expect(() => initialsOf(null)).not.toThrow();
    expect(initialsOf(undefined)).toBe("");
    expect(initialsOf(null)).toBe("");
  });

  it("takes at most two initials", () => {
    expect(initialsOf("Ayu Pratiwi")).toBe("AP");
    expect(initialsOf("Ni Luh Sari Dewi")).toBe("NL");
  });

  it("handles a single word, extra spaces and empty input", () => {
    expect(initialsOf("Milk")).toBe("M");
    expect(initialsOf("  Milk   &  Madu ")).toBe("M&");
    expect(initialsOf("")).toBe("");
  });
});
