/** Tiny classname joiner (no dependency). Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Money and date formatting moved to `src/lib/format.ts` when the app became
// bilingual — they need a locale, which a classname helper has no business
// knowing about.
