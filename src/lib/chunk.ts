/**
 * Firestore commits at most 500 writes per batch and throws past that, so every
 * write loop over an unbounded collection has to be split. Kept pure and
 * separate from the repos so the boundary arithmetic is directly testable —
 * an off-by-one here only shows up once a job matches 501 candidates.
 */

/** Firestore's hard limit on operations in a single WriteBatch. */
export const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Writes per batch. Below the hard limit so a caller that adds an extra
 * bookkeeping write to a batch can't tip it over.
 */
export const BATCH_CHUNK_SIZE = 450;

/** Split `items` into consecutive runs of at most `size`. */
export function chunk<T>(items: readonly T[], size = BATCH_CHUNK_SIZE): T[][] {
  if (size < 1) throw new Error("chunk size must be at least 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
