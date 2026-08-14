/**
 * Dictionary lookup and interpolation. No Node-only APIs — client components
 * import this too.
 */

import { en, type DictionaryKey } from "./en";
import { id } from "./id";
import { DEFAULT_LOCALE, type Locale } from "./config";

/** Every locale must supply the full English key set. */
export type Dictionary = Record<DictionaryKey, string>;
export type { DictionaryKey };

const DICTIONARIES: Record<Locale, Dictionary> = { en, id };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type TranslateVars = Record<string, string | number>;
export type Translate = (key: DictionaryKey, vars?: TranslateVars) => string;

/**
 * Resolve a key and substitute `{name}` placeholders.
 *
 * A missing key falls back to English rather than rendering the raw key — a
 * half-translated screen is a much better failure than `job.postedAgo` in the
 * middle of a card. The parity test keeps this from being load-bearing.
 */
export function translate(
  dict: Partial<Dictionary>,
  key: DictionaryKey,
  vars?: TranslateVars,
): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function createTranslate(dict: Partial<Dictionary>): Translate {
  return (key, vars) => translate(dict, key, vars);
}

/**
 * Namespaces that client components need. Everything else stays on the server,
 * so the RSC payload carries roughly a third of the dictionary rather than all
 * of it.
 */
const CLIENT_NAMESPACES = ["common", "auth", "filter", "job", "chat", "employer", "error"];

export function clientSlice(dict: Dictionary): Partial<Dictionary> {
  const out: Partial<Dictionary> = {};
  for (const key of Object.keys(dict) as DictionaryKey[]) {
    if (CLIENT_NAMESPACES.includes(key.slice(0, key.indexOf(".")))) {
      out[key] = dict[key];
    }
  }
  return out;
}
