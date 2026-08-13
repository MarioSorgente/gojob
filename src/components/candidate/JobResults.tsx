"use client";

import { useState } from "react";
import { loadJobsPageAction } from "@/app/search-actions";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState } from "@/components/ui";
import type { JobFilters } from "@/lib/search";
import type { JobResult } from "@/lib/searchResults";

/**
 * Ranked job list with "Load more". The first page arrives server-rendered;
 * later pages are appended so the feed reads continuously.
 */
export function JobResults({
  initialItems,
  initialCursor,
  filters,
  emptyTitle,
  emptyHint,
}: {
  initialItems: JobResult[];
  initialCursor: string | null;
  filters: JobFilters;
  emptyTitle: string;
  emptyHint: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const page = await loadJobsPageAction(filters, cursor);
      setItems((prev) => {
        const seen = new Set(prev.map((r) => r.job.id));
        return [...prev, ...page.items.filter((r) => !seen.has(r.job.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more jobs.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <EmptyState icon="🔎" title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((r) => (
          <JobCard
            key={r.job.id}
            job={r.job}
            score={r.score}
            reasons={r.reasons}
            breakdown={r.breakdown}
            href={`/candidate/jobs/${r.job.id}`}
          />
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
