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
  label = "Jobs",
  emptyTitle,
  emptyHint,
}: {
  initialItems: JobResult[];
  initialCursor: string | null;
  filters: JobFilters;
  label?: string;
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

  return (
    <section aria-labelledby="job-results-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="job-results-heading" className="font-bold text-slate-800">
          {label}
        </h2>
        <p className="shrink-0 text-sm text-muted" aria-live="polite">
          {items.length} {items.length === 1 ? "job" : "jobs"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {items.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon="🔎" title={emptyTitle} hint={emptyHint} />
          </div>
        ) : (
          items.map((r) => (
            <div key={r.job.id} className="h-full min-w-0">
              <JobCard
                job={r.job}
                score={r.score}
                reasons={r.reasons}
                breakdown={r.breakdown}
                href={`/candidate/jobs/${r.job.id}`}
              />
            </div>
          ))
        )}

        {items.length > 0 && (
          <div className="col-span-full">
            <LoadMoreButton
              hasMore={cursor !== null}
              loading={loading}
              error={error}
              onClick={() => void loadMore()}
            />
          </div>
        )}
      </div>
    </section>
  );
}
