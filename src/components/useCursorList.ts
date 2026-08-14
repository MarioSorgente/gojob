"use client";

import { useCallback, useState } from "react";

/**
 * The "first page server-rendered, later pages appended" state machine.
 *
 * JobResults and CandidateResults each had their own copy — same four pieces of
 * state, same dedupe, same swallowed error. Pagination is deliberately
 * cursor-based (see src/lib/pagination.ts): Firestore has no cheap offset, so
 * numbered pages would cost a full re-read per page.
 */
export function useCursorList<T>({
  initialItems,
  initialCursor,
  getId,
  fetchPage,
}: {
  initialItems: T[];
  initialCursor: string | null;
  getId: (item: T) => string;
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await fetchPage(cursor);
      setItems((prev) => {
        // The ranked window can shift between pages, so the same document can
        // legitimately arrive twice. Dropping duplicates keeps React keys unique.
        const seen = new Set(prev.map(getId));
        return [...prev, ...page.items.filter((item) => !seen.has(getId(item)))];
      });
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, fetchPage, getId, loading]);

  return {
    items,
    hasMore: cursor !== null,
    loading,
    failed,
    loadMore: () => void loadMore(),
  };
}
