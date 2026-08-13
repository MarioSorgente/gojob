"use client";

import { useState } from "react";
import Link from "next/link";
import { loadCandidatesPageAction } from "@/app/search-actions";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { EmptyState } from "@/components/ui";
import { ApplicantRow } from "./ApplicantRow";
import { InviteToJobButton } from "./InviteToJobButton";
import type { CandidateFilters } from "@/lib/search";
import type { CandidateResult } from "@/lib/searchResults";

/**
 * The employer's candidate list. The first page is rendered on the server;
 * this appends later pages in place rather than replacing the list, so an
 * employer scrolling the pool doesn't lose their position.
 */
export function CandidateResults({
  initialItems,
  initialCursor,
  filters,
  jobs,
}: {
  initialItems: CandidateResult[];
  initialCursor: string | null;
  filters: CandidateFilters;
  jobs: { id: string; role: string }[];
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const page = await loadCandidatesPageAction(filters, cursor);
      // De-duplicate defensively: a profile edited mid-scroll can shift
      // position and reappear in a later page.
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.userId));
        return [...prev, ...page.items.filter((c) => !seen.has(c.userId))];
      });
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more candidates.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="No candidates match those filters"
        hint="Try widening the area or lowering the experience requirement."
      />
    );
  }

  return (
    <>
      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {items.map((c) => (
          // Stretched link rather than wrapping the row: a <button> inside an
          // <a> is invalid, and the previous `<div onClick={preventDefault}>`
          // only suppressed mouse clicks — keyboard activation of Invite still
          // navigated away.
          <div key={c.userId} className="relative">
            <ApplicantRow
              summary={c.summary}
              score={c.profileStrength}
              scoreLabel="profile"
              right={
                <div className="relative z-10">
                  <InviteToJobButton
                    candidateId={c.userId}
                    name={c.firstName}
                    jobs={jobs}
                  />
                </div>
              }
            />
            <Link
              href={`/employer/candidates/${c.userId}`}
              className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="sr-only">View {c.firstName}&apos;s profile</span>
            </Link>
          </div>
        ))}
      </div>
      <LoadMoreButton
        hasMore={cursor !== null}
        loading={loading}
        error={error}
        onClick={() => void loadMore()}
      />
    </>
  );
}
