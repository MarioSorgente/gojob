/**
 * Display labels for taxonomy values.
 *
 * **The values in `src/lib/taxonomy.ts` are stored in Firestore.** They are
 * match keys, query values and index fields — `role: "Barista"`,
 * `employmentType: "Full-time"`. They must never be translated at the data
 * layer. This module is a render-time lookup only: `<option value>` keeps the
 * canonical English, and only the text a human reads changes.
 *
 * Anything without an entry falls through to the stored value. That is the
 * right behaviour for the free-text "Other" that most of these fields allow,
 * and for area names (Canggu, Ubud), which are proper nouns in both languages.
 */

import {
  AVAILABILITY_TYPES,
  BUSINESS_CATEGORIES,
  EMPLOYMENT_TYPES,
  LANGUAGES,
  PROFICIENCY_LEVELS,
  ROLES,
  SALARY_TYPES,
} from "../taxonomy";
import type { Locale } from "./config";

type LabelMap = Partial<Record<string, string>>;

const ROLE_ID: LabelMap = {
  Barista: "Barista",
  "Waiter / Waitress": "Pramusaji",
  Bartender: "Bartender",
  "Host / Hostess": "Penerima tamu",
  Cashier: "Kasir",
  Chef: "Chef",
  "Sous Chef": "Sous chef",
  Cook: "Juru masak",
  "Kitchen Helper": "Asisten dapur",
  Dishwasher: "Pencuci piring",
  "Restaurant Manager": "Manajer restoran",
  Supervisor: "Supervisor",
  Housekeeping: "Housekeeping",
  Receptionist: "Resepsionis",
  Security: "Keamanan",
  "Spa Therapist": "Terapis spa",
  Other: "Lainnya",
};

const EMPLOYMENT_TYPE_ID: LabelMap = {
  "Full-time": "Penuh waktu",
  "Part-time": "Paruh waktu",
  "Daily Worker": "Harian",
  Temporary: "Kontrak sementara",
  Internship: "Magang",
  Freelance: "Lepas",
};

const SALARY_TYPE_ID: LabelMap = {
  Monthly: "Bulanan",
  Daily: "Harian",
  Hourly: "Per jam",
};

const AVAILABILITY_ID: LabelMap = {
  "Available immediately": "Bisa mulai segera",
  "Available within 7 days": "Bisa mulai dalam 7 hari",
  "Available within 14 days": "Bisa mulai dalam 14 hari",
  "Available within 30 days": "Bisa mulai dalam 30 hari",
  "Custom date": "Tanggal tertentu",
};

const PROFICIENCY_ID: LabelMap = {
  Basic: "Dasar",
  Conversational: "Percakapan",
  Fluent: "Lancar",
  Native: "Penutur asli",
};

const LANGUAGE_ID: LabelMap = {
  Indonesian: "Indonesia",
  English: "Inggris",
  Balinese: "Bali",
  Russian: "Rusia",
  Mandarin: "Mandarin",
  Japanese: "Jepang",
  Korean: "Korea",
  French: "Prancis",
  German: "Jerman",
  Spanish: "Spanyol",
  Italian: "Italia",
  Dutch: "Belanda",
  Arabic: "Arab",
  Other: "Lainnya",
};

const BUSINESS_CATEGORY_ID: LabelMap = {
  Café: "Kafe",
  Restaurant: "Restoran",
  Hotel: "Hotel",
  Bar: "Bar",
  "Beach Club": "Beach club",
  Nightclub: "Kelab malam",
  Bakery: "Toko roti",
  "Coffee Shop": "Kedai kopi",
  Resort: "Resor",
  Villa: "Vila",
  Spa: "Spa",
  Warung: "Warung",
  Other: "Lainnya",
};

function lookup(map: LabelMap, locale: Locale, value: string): string {
  return locale === "id" ? (map[value] ?? value) : value;
}

export const roleLabel = (v: string, l: Locale) => lookup(ROLE_ID, l, v);
export const employmentTypeLabel = (v: string, l: Locale) =>
  lookup(EMPLOYMENT_TYPE_ID, l, v);
export const salaryTypeLabel = (v: string, l: Locale) => lookup(SALARY_TYPE_ID, l, v);
export const availabilityLabel = (v: string, l: Locale) => lookup(AVAILABILITY_ID, l, v);
export const proficiencyLabel = (v: string, l: Locale) => lookup(PROFICIENCY_ID, l, v);
export const languageLabel = (v: string, l: Locale) => lookup(LANGUAGE_ID, l, v);
export const businessCategoryLabel = (v: string, l: Locale) =>
  lookup(BUSINESS_CATEGORY_ID, l, v);

/**
 * Bali place names are proper nouns — Canggu is Canggu in both languages — so
 * this map is intentionally empty and every value falls through unchanged.
 * It exists so call sites can treat areas like every other taxonomy.
 */
const AREA_ID: LabelMap = {};
export const areaLabel = (v: string, l: Locale) => lookup(AREA_ID, l, v);

/** The period word for a salary type: "month" / "bulan". Feeds formatSalaryRange. */
export function salaryPeriodLabel(salaryType: string, locale: Locale): string {
  if (locale === "id") {
    return salaryType === "Monthly"
      ? "bulan"
      : salaryType === "Daily"
        ? "hari"
        : salaryType === "Hourly"
          ? "jam"
          : "";
  }
  return salaryType === "Monthly"
    ? "month"
    : salaryType === "Daily"
      ? "day"
      : salaryType === "Hourly"
        ? "hour"
        : "";
}

/** Turn a taxonomy constant into `{ value, label }` pairs for a <select>. */
export function options(
  values: readonly string[],
  locale: Locale,
  label: (v: string, l: Locale) => string,
): { value: string; label: string }[] {
  return values.map((value) => ({ value, label: label(value, locale) }));
}

/** Exported for the coverage test — every list that has an Indonesian map. */
export const TRANSLATED_TAXONOMIES = [
  { name: "ROLES", values: ROLES, map: ROLE_ID },
  { name: "EMPLOYMENT_TYPES", values: EMPLOYMENT_TYPES, map: EMPLOYMENT_TYPE_ID },
  { name: "SALARY_TYPES", values: SALARY_TYPES, map: SALARY_TYPE_ID },
  { name: "AVAILABILITY_TYPES", values: AVAILABILITY_TYPES, map: AVAILABILITY_ID },
  { name: "PROFICIENCY_LEVELS", values: PROFICIENCY_LEVELS, map: PROFICIENCY_ID },
  { name: "LANGUAGES", values: LANGUAGES, map: LANGUAGE_ID },
  { name: "BUSINESS_CATEGORIES", values: BUSINESS_CATEGORIES, map: BUSINESS_CATEGORY_ID },
] as const;
