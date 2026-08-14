import { describe, expect, it } from "vitest";
import { en } from "./en";
import { id } from "./id";
import { clientSlice, getDictionary, translate } from "./dictionary";
import { LOCALES, isLocale, localeFromAcceptLanguage } from "./config";
import { TRANSLATED_TAXONOMIES, salaryPeriodLabel } from "./taxonomy";

/**
 * A half-translated screen is the most common way a two-language app rots. The
 * `Dictionary` type catches a missing key at compile time; these catch the
 * things a type cannot — empty strings, stray keys, and placeholders that were
 * dropped or renamed during translation.
 */

describe("dictionaries", () => {
  it("cover exactly the same keys in every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(getDictionary(locale)).sort()).toEqual(
        Object.keys(en).sort(),
      );
    }
  });

  it("has no empty or whitespace-only values", () => {
    for (const locale of LOCALES) {
      const dict = getDictionary(locale);
      const blank = Object.entries(dict)
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => key);
      expect(blank, `blank values in "${locale}"`).toEqual([]);
    }
  });

  it("keeps the same interpolation placeholders as English", () => {
    const placeholders = (s: string) =>
      (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");

    for (const [key, source] of Object.entries(en)) {
      expect(
        placeholders(id[key as keyof typeof en]),
        `placeholders drifted on "${key}"`,
      ).toBe(placeholders(source));
    }
  });

  it("does not leave English text in the Indonesian dictionary", () => {
    // Strings that are genuinely identical in both languages. Listing them
    // explicitly keeps the check strict: a new untranslated string fails rather
    // than slipping through a loosened heuristic.
    const IDENTICAL_BY_DESIGN = new Set<string>([
      "landing.previewSubtitle", // "Barista · Canggu" — both proper nouns
    ]);

    // Short values (loanwords, brand names) are fine; a copy-paste of a whole
    // phrase is not.
    const suspicious = Object.entries(en)
      .filter(([key, source]) => {
        if (IDENTICAL_BY_DESIGN.has(key)) return false;
        return (
          id[key as keyof typeof en] === source &&
          source.trim().split(/\s+/).length > 2
        );
      })
      .map(([key]) => key);
    expect(suspicious).toEqual([]);
  });
});

describe("translate", () => {
  it("substitutes named placeholders", () => {
    expect(translate(en, "candidate.greeting", { name: "Ayu" })).toBe("Hi Ayu");
    expect(translate(id, "candidate.greeting", { name: "Ayu" })).toBe("Halo Ayu");
  });

  it("leaves unknown placeholders in place rather than printing undefined", () => {
    expect(translate(en, "job.postedAgo", {})).toBe("Posted {time}");
  });

  it("falls back to English when a locale is missing a key", () => {
    // A partial dictionary is what a client component receives.
    expect(translate({}, "common.logIn")).toBe("Log in");
  });
});

describe("clientSlice", () => {
  it("ships the client namespaces and withholds the server-only ones", () => {
    const slice = clientSlice(en);
    expect(slice["common.logIn"]).toBe("Log in");
    expect(slice["filter.filters"]).toBe("Filters");
    expect(slice["landing.title"]).toBeUndefined();
    expect(slice["candidate.profileTitle"]).toBeUndefined();
  });

  it("is meaningfully smaller than the full dictionary", () => {
    expect(Object.keys(clientSlice(en)).length).toBeLessThan(
      Object.keys(en).length,
    );
  });
});

describe("locale detection", () => {
  it("recognises supported locales only", () => {
    expect(isLocale("id")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("reads Accept-Language, including the legacy Indonesian tag", () => {
    expect(localeFromAcceptLanguage("id-ID,id;q=0.9,en;q=0.8")).toBe("id");
    expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("in;q=0.9")).toBe("id"); // pre-1989 ISO code
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });
});

describe("taxonomy labels", () => {
  it("translates every value of every mapped taxonomy", () => {
    for (const { name, values, map } of TRANSLATED_TAXONOMIES) {
      const missing = values.filter((v) => !map[v]);
      expect(missing, `untranslated values in ${name}`).toEqual([]);
    }
  });

  it("supplies a salary period word for every salary type", () => {
    for (const type of ["Monthly", "Daily", "Hourly"]) {
      expect(salaryPeriodLabel(type, "en")).not.toBe("");
      expect(salaryPeriodLabel(type, "id")).not.toBe("");
    }
  });
});
