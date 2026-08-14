/**
 * Locale-aware display formatting.
 *
 * Money is stored as integer IDR and dates as ISO strings (see ARCHITECTURE);
 * nothing here changes what is persisted. Every formatter is pinned to the app
 * locale and to Asia/Makassar rather than the browser's — chat timestamps used
 * to follow the browser locale, which both disagreed with the surrounding UI
 * and made SSR and client render differently.
 */

import { APP_TIME_ZONE, INTL_LOCALE, type Locale } from "./i18n/config";
import { salaryPeriodLabel } from "./i18n/taxonomy";

const currency = new Map<Locale, Intl.NumberFormat>();
const compact = new Map<Locale, Intl.NumberFormat>();

function currencyFormatter(locale: Locale): Intl.NumberFormat {
  let f = currency.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
    currency.set(locale, f);
  }
  return f;
}

/** Full rupiah, the way Indonesian job boards write it: `Rp 6.000.000`. */
export function formatIDR(
  amount: number | null | undefined,
  locale: Locale,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  // id-ID renders "Rp 6.000.000"; en-US renders "IDR 6,000,000" — normalise the
  // symbol so the currency reads the same in both languages.
  return currencyFormatter(locale).format(amount).replace(/^IDR\s?/, "Rp ");
}

/** Abbreviated, for slots too narrow for the full number: `Rp 6,5 jt` / `Rp 6.5M`. */
export function formatIDRCompact(
  amount: number | null | undefined,
  locale: Locale,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  let f = compact.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(INTL_LOCALE[locale], {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compact.set(locale, f);
  }
  return `Rp ${f.format(amount)}`;
}

/**
 * A salary range for a card or detail page.
 *
 * `perLabel` supplies the period word ("month" / "bulan") from the dictionary —
 * it used to be a hardcoded English ternary inside the formatter.
 */
export function formatSalaryRange(
  salaryType: string,
  min: number | null | undefined,
  max: number | null | undefined,
  locale: Locale,
  perLabel?: (salaryType: string) => string,
): string {
  if (min == null && max == null) return "";
  const per = perLabel?.(salaryType);
  const unit = per ? ` / ${per}` : "";
  if (min != null && max != null && min !== max) {
    return `${formatIDR(min, locale)} – ${formatIDR(max, locale)}${unit}`;
  }
  return `${formatIDR(min ?? max, locale)}${unit}`;
}

/**
 * The form every page actually wants: a salary range with the right period word
 * already attached. `formatSalaryRange` stays available for the rare caller that
 * needs to supply its own labelling.
 */
export function formatSalary(
  salaryType: string,
  min: number | null | undefined,
  max: number | null | undefined,
  locale: Locale,
): string {
  return formatSalaryRange(salaryType, min, max, locale, (t) =>
    salaryPeriodLabel(t, locale),
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}

/** `12 Aug 2026` / `12 Agu 2026`. */
export function formatDate(
  value: string | number | Date | null | undefined,
  locale: Locale,
): string {
  const d = toDate(value);
  if (!d) return "";
  return dateFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** `Aug 2026` — for experience entries, which only carry month precision. */
export function formatMonthYear(
  value: string | number | Date | null | undefined,
  locale: Locale,
): string {
  const d = toDate(value);
  if (!d) return "";
  return dateFormat(locale, { month: "short", year: "numeric" }).format(d);
}

/** `Tue, 12 Aug` — day separators in chat. */
export function formatDayLabel(
  value: string | number | Date | null | undefined,
  locale: Locale,
): string {
  const d = toDate(value);
  if (!d) return "";
  return dateFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d);
}

/** `14:05`. 24-hour in both locales — Indonesia does not use AM/PM. */
export function formatTime(
  value: string | number | Date | null | undefined,
  locale: Locale,
): string {
  const d = toDate(value);
  if (!d) return "";
  return dateFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Calendar day key in app time, for grouping messages without UTC drift. */
export function dayKey(
  value: string | number | Date | null | undefined,
  locale: Locale = "en",
): string {
  const d = toDate(value);
  if (!d) return "";
  return dateFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * `3 days ago` / `3 hari lalu`. Used for "posted N ago" on job cards and for
 * conversation timestamps.
 *
 * `now` is injectable so tests don't depend on the wall clock.
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  locale: Locale,
  now: number = Date.now(),
): string {
  const d = toDate(value);
  if (!d) return "";
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);

  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
  if (abs < 60 * 1000) return rtf.format(0, "second");

  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / (60 * 1000)), "minute");
}
