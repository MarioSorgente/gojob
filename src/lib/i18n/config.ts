/**
 * Locale configuration. Kept free of Node-only APIs so middleware, server
 * helpers and client components can all import it.
 */

export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Readable, non-httpOnly so the switcher can be optimistic if it ever needs to. */
export const LOCALE_COOKIE = "gojob_lang";
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** BCP-47 tags used for every `Intl` formatter. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  id: "id-ID",
};

/** Single-market product: Bali runs on WITA year-round. */
export const APP_TIME_ZONE = "Asia/Makassar";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best locale from an `Accept-Language` header. Deliberately simple: we only
 * ship two languages, so the first supported tag wins and quality values don't
 * change the outcome often enough to justify a parser.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split("-")[0];
    if (base === "id" || base === "in") return "id"; // "in" is the legacy ISO code
    if (base === "en") return "en";
  }
  return null;
}
