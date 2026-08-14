/**
 * Server-side locale resolution. Node runtime only — imports `next/headers`.
 */

import "server-only";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "./config";
import {
  createTranslate,
  getDictionary,
  type Dictionary,
  type Translate,
} from "./dictionary";
import { getSessionUser } from "../auth";

/**
 * Resolution order: explicit choice (cookie) → the signed-in user's saved
 * preference → what the browser asks for → English.
 *
 * `users.language` has existed in the model since the beginning without a
 * single reader; this is it.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const user = await getSessionUser();
  if (isLocale(user?.language)) return user.language;

  const headerList = await headers();
  return (
    localeFromAcceptLanguage(headerList.get("accept-language")) ?? DEFAULT_LOCALE
  );
}

export async function getDict(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}

/** The server-component translator: `const t = await getT()`. */
export async function getT(): Promise<Translate> {
  return createTranslate(await getDict());
}

/** Both at once, for the common case where a page needs to format money too. */
export async function getI18n(): Promise<{ locale: Locale; t: Translate }> {
  const locale = await getLocale();
  return { locale, t: createTranslate(getDictionary(locale)) };
}
