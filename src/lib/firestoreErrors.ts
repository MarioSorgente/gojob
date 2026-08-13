/**
 * Recognising Firestore's "index missing" failure.
 *
 * A composite or collection-group index has to be created *and then built*
 * before the query it serves will run — building takes minutes on a populated
 * collection. Until then Firestore returns FAILED_PRECONDITION (gRPC code 9),
 * and a single un-handled one took down the whole candidate app: the nav badge
 * query threw, so the layout threw, so every page under it 500'd.
 *
 * Queries that can answer a slower way should catch this and degrade rather
 * than crash. They repair themselves once the index finishes building.
 */

const MISSING_INDEX = /requires an index|requires a .*index|FAILED_PRECONDITION/i;

export function isMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown; details?: unknown };
  if (e.code === 9) return true;
  const text = `${typeof e.message === "string" ? e.message : ""} ${
    typeof e.details === "string" ? e.details : ""
  }`;
  return MISSING_INDEX.test(text);
}

/**
 * Run `query`; if it fails only because an index is missing, run `fallback`.
 *
 * Any other error propagates — this must not turn real bugs into silent
 * degradation. `label` identifies the query in the log so a permanently missing
 * index is visible rather than merely slow.
 */
export async function withIndexFallback<T>(
  label: string,
  query: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;
    console.warn(
      `[firestore] ${label}: index missing or still building — using the slower fallback. ` +
        `Deploy firestore.indexes.json to remove this. ${
          (error as { details?: string }).details ?? ""
        }`,
    );
    return fallback();
  }
}
