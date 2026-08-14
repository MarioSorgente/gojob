"use client";

import { useCallback } from "react";
import { loadJobsPageAction } from "@/app/search-actions";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { JobCard } from "@/components/cards/JobCard";
import { useCursorList } from "@/components/useCursorList";
import { EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import type { JobFilters } from "@/lib/search";
import type { JobResult } from "@/lib/searchResults";
import type { CandidateAction } from "@/lib/types";
import type { ReactNode } from "react";

/**
 * Ranked job list with "Load more". The first page arrives server-rendered;
 * later pages are appended so the feed reads continuously.
 */
export function JobResults({
  initialItems,
  initialCursor,
  filters,
  label,
  emptyTitle,
  emptyHint,
  emptyAction,
  actions,
}: {
  initialItems: JobResult[];
  initialCursor: string | null;
  filters: JobFilters;
  label: string;
  emptyTitle: string;
  emptyHint: string;
  /** A way out of the empty state. An empty list with no next step is a dead end. */
  emptyAction?: ReactNode;
  /** jobId → what this candidate already did, so the feed can mark dead ends. */
  actions?: Record<string, CandidateAction>;
}) {
  const { locale, t } = useI18n();

  const fetchPage = useCallback(
    (cursor: string | null) => loadJobsPageAction(filters, cursor),
    [filters],
  );

  const { items, hasMore, loading, failed, loadMore } = useCursorList<JobResult>({
    initialItems,
    initialCursor,
    getId: (r) => r.job.id,
    fetchPage,
  });

  return (
    <section aria-labelledby="job-results-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="job-results-heading" className="type-heading">
          {label}
        </h2>
        <p className="shrink-0 text-sm text-muted" aria-live="polite">
          {items.length === 1
            ? t("filter.resultsCountOne")
            : hasMore
              ? t("filter.resultsCountCapped", { count: items.length })
              : t("filter.resultsCount", { count: items.length })}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="search"
          title={emptyTitle}
          hint={emptyHint}
          action={emptyAction}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {items.map((r) => (
              <li key={r.job.id} className="h-full min-w-0">
                <JobCard
                  job={r.job}
                  score={r.score}
                  reasons={r.reasons}
                  breakdown={r.breakdown}
                  href={`/candidate/jobs/${r.job.id}`}
                  action={actions?.[r.job.id]}
                  locale={locale}
                  t={t}
                />
              </li>
            ))}
          </ul>
          <LoadMoreButton
            hasMore={hasMore}
            loading={loading}
            failed={failed}
            onClick={loadMore}
          />
        </>
      )}
    </section>
  );
}
