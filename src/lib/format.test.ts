import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDate,
  formatIDR,
  formatIDRCompact,
  formatMonthYear,
  formatRelativeTime,
  formatSalaryRange,
  formatTime,
} from "./format";
import { salaryPeriodLabel } from "./i18n/taxonomy";

/**
 * Intl output varies by ICU version in the separators it chooses, so these
 * assert the properties that matter — currency symbol, digit grouping, the
 * absence of decimals — rather than exact byte-for-byte strings.
 */

const per = (locale: "en" | "id") => (t: string) => salaryPeriodLabel(t, locale);

describe("formatIDR", () => {
  it("writes full rupiah with no decimals", () => {
    const out = formatIDR(6_000_000, "id");
    expect(out.startsWith("Rp")).toBe(true);
    expect(out).not.toContain(",00");
    expect(out.replace(/\D/g, "")).toBe("6000000");
  });

  it("uses the Rp symbol in English too, so currency reads the same", () => {
    expect(formatIDR(6_000_000, "en").startsWith("Rp")).toBe(true);
    expect(formatIDR(6_000_000, "en")).not.toContain("IDR");
  });

  it("returns an empty string for missing or non-finite amounts", () => {
    expect(formatIDR(null, "id")).toBe("");
    expect(formatIDR(undefined, "en")).toBe("");
    expect(formatIDR(Number.NaN, "en")).toBe("");
  });

  it("formats zero rather than treating it as absent", () => {
    expect(formatIDR(0, "id")).not.toBe("");
  });
});

describe("formatIDRCompact", () => {
  it("abbreviates millions", () => {
    expect(formatIDRCompact(6_500_000, "en")).toBe("Rp 6.5M");
    expect(formatIDRCompact(6_500_000, "id")).toMatch(/^Rp 6,5\s?jt$/);
  });
});

describe("formatSalaryRange", () => {
  it("renders a range with the localized period word", () => {
    const en = formatSalaryRange("Monthly", 6_000_000, 7_000_000, "en", per("en"));
    expect(en).toContain("–");
    expect(en.endsWith("/ month")).toBe(true);

    const id = formatSalaryRange("Monthly", 6_000_000, 7_000_000, "id", per("id"));
    expect(id.endsWith("/ bulan")).toBe(true);
  });

  it("collapses a single-value range", () => {
    const out = formatSalaryRange("Daily", 500_000, 500_000, "en", per("en"));
    expect(out).not.toContain("–");
    expect(out.endsWith("/ day")).toBe(true);
  });

  it("handles an open-ended range", () => {
    expect(formatSalaryRange("Monthly", 6_000_000, null, "en", per("en"))).toContain(
      "Rp",
    );
    expect(formatSalaryRange("Monthly", null, 7_000_000, "en", per("en"))).toContain(
      "Rp",
    );
  });

  it("returns an empty string when no salary is set", () => {
    expect(formatSalaryRange("Monthly", null, null, "en", per("en"))).toBe("");
  });

  it("omits the period when no label is supplied", () => {
    expect(formatSalaryRange("Monthly", 6_000_000, null, "en")).not.toContain("/");
  });
});

describe("dates", () => {
  const iso = "2026-08-12T09:30:00.000Z"; // 17:30 in Asia/Makassar (UTC+8)

  it("formats a date in both locales", () => {
    expect(formatDate(iso, "en")).toMatch(/2026/);
    expect(formatDate(iso, "id")).toMatch(/2026/);
  });

  it("formats month and year for experience entries", () => {
    expect(formatMonthYear("2024-03-01", "en")).toMatch(/2024/);
  });

  it("uses app time, not UTC, so the day never slips", () => {
    // 09:30 UTC is 17:30 the same day in WITA — and 23:30 UTC is the next day.
    expect(formatTime(iso, "en")).toBe("17:30");
    expect(dayKey("2026-08-12T23:30:00.000Z")).not.toBe(dayKey(iso));
  });

  it("returns an empty string for unparseable input", () => {
    expect(formatDate("not-a-date", "en")).toBe("");
    expect(formatTime(null, "en")).toBe("");
    expect(formatMonthYear(undefined, "id")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-08-12T12:00:00.000Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const DAY = 24 * 60 * 60 * 1000;

  it("picks the largest sensible unit", () => {
    expect(formatRelativeTime(ago(3 * DAY), "en", now)).toBe("3 days ago");
    expect(formatRelativeTime(ago(2 * 60 * 60 * 1000), "en", now)).toBe("2 hours ago");
    expect(formatRelativeTime(ago(10 * DAY), "en", now)).toMatch(/week/);
    expect(formatRelativeTime(ago(60 * DAY), "en", now)).toMatch(/month/);
  });

  it("translates", () => {
    expect(formatRelativeTime(ago(3 * DAY), "id", now)).toMatch(/hari/);
  });

  it("collapses anything under a minute to 'now'", () => {
    expect(formatRelativeTime(ago(5_000), "en", now)).toBe("now");
  });

  it("returns an empty string for missing input", () => {
    expect(formatRelativeTime(null, "en", now)).toBe("");
  });
});
