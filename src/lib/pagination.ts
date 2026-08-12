/**
 * Cursor pagination helpers.
 *
 * Every list in the app used to render its entire result set, and the search
 * repos read whole collections to filter in memory — fine at demo scale, but
 * Firestore bills per document read, so cost and latency grew with the
 * collection rather than with what was shown.
 *
 * Cursors are opaque strings so the shape can change without breaking URLs
 * that users have already shared or bookmarked.
 */

/** How many items a list renders per page. */
export const PAGE_SIZE = 20;

/**
 * Multiplier applied when reading from Firestore ahead of in-memory filtering.
 *
 * Not every filter can be pushed into the query, so a page of raw documents may
 * shrink once the residual predicates run. Over-fetching keeps the common case
 * to a single round trip; `paginateFiltered` loops if it still comes up short.
 */
export const OVER_FETCH = 4;

/** Hard stop on read amplification when filters match almost nothing. */
export const MAX_FETCH_ROUNDS = 5;

export interface Page<T> {
  items: T[];
  /** Pass back to fetch the following page. Null when the list is exhausted. */
  nextCursor: string | null;
}

export function encodeCursor<T>(value: T): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCursor<T>(cursor: string | null | undefined): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    // A tampered or stale cursor restarts the list rather than erroring: this
    // value comes straight off the query string.
    return null;
  }
}

/**
 * Page a source that can only be partly filtered at the database.
 *
 * `fetchBatch` returns documents already narrowed by whatever the query could
 * express; `keep` applies the rest. Batches are pulled until the page is full,
 * the source runs dry, or MAX_FETCH_ROUNDS is hit — so a filter matching almost
 * nothing degrades to a bounded number of reads instead of a full scan.
 */
export async function paginateFiltered<T>({
  fetchBatch,
  keep,
  cursorOf,
  startCursor,
  pageSize = PAGE_SIZE,
}: {
  fetchBatch: (after: string | null, limit: number) => Promise<T[]>;
  keep: (item: T) => boolean;
  cursorOf: (item: T) => string;
  startCursor: string | null;
  pageSize?: number;
}): Promise<Page<T>> {
  const items: T[] = [];
  let after = startCursor;
  let exhausted = false;

  // Constant batch size rather than one scaled to the remaining shortfall:
  // shrinking it makes each successive round smaller, so a selective filter
  // burns its round budget on tiny reads and returns a short page.
  const want = pageSize * OVER_FETCH;

  for (let round = 0; round < MAX_FETCH_ROUNDS && !exhausted; round++) {
    const batch = await fetchBatch(after, want);

    if (batch.length < want) exhausted = true;
    if (batch.length === 0) break;

    after = cursorOf(batch[batch.length - 1]);

    for (const item of batch) {
      if (!keep(item)) continue;
      items.push(item);
      // Stop at the page boundary so `after` reflects the last item we
      // actually returned, keeping the next page contiguous.
      if (items.length === pageSize) {
        return { items, nextCursor: cursorOf(item) };
      }
    }
  }

  return { items, nextCursor: exhausted ? null : after };
}

/** Page an already-materialised, already-ordered array. */
export function paginateArray<T>(
  all: T[],
  startCursor: string | null,
  pageSize = PAGE_SIZE,
): Page<T> {
  const offset = decodeCursor<{ offset: number }>(startCursor)?.offset ?? 0;
  const safeOffset = Number.isInteger(offset) && offset > 0 ? offset : 0;

  const items = all.slice(safeOffset, safeOffset + pageSize);
  const next = safeOffset + items.length;
  return {
    items,
    nextCursor: next < all.length ? encodeCursor({ offset: next }) : null,
  };
}
