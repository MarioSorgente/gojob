"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import {
  createTranslate,
  type Dictionary,
  type Translate,
} from "./dictionary";

/**
 * The browser half of the i18n layer.
 *
 * The provider receives an already-resolved locale and a *slice* of the
 * dictionary (see `clientSlice`), both plain serializable values, so the root
 * layout can stay a server component and no locale detection happens twice.
 */

interface I18nValue {
  locale: Locale;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Partial<Dictionary>;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslate(dict) }),
    [locale, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Falls back to an English translator rather than throwing when a client
 * component renders outside the provider — a missing provider should not blank
 * a screen.
 */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  const fallback = useMemo<I18nValue>(
    () => ({ locale: DEFAULT_LOCALE, t: createTranslate({}) }),
    [],
  );
  return ctx ?? fallback;
}

export function useT(): Translate {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
