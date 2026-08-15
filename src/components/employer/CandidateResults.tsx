"use client";

import { useCallback } from "react";
import Link from "next/link";
import { loadCandidatesPageAction } from "@/app/search-actions";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useCursorList } from "@/components/useCursorList";
import { ButtonLink, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
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
  const { locale, t } = useI18n();

  const fetchPage = useCallback(
    (cursor: string | null) => loadCandidatesPageAction(filters, cursor),
    [filters],
  );

  const { items, hasMore, loading, failed, loadMore } = useCursorList<CandidateResult>({
    initialItems,
    initialCursor,
    getId: (c) => c.userId,
    fetchPage,
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={t("employer.noCandidates")}
        hint={t("employer.noCandidatesHint")}
        action={
          <ButtonLink href="/employer/candidates" variant="outline">
            {t("common.clearAll")}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {items.map((c) => (
          // Stretched link rather than wrapping the row: a <button> inside an
          // <a> is invalid, and the previous `<div onClick={preventDefault}>`
          // only suppressed mouse clicks — keyboard activation of Invite still
          // navigated away.
          <li key={c.userId} className="relative">
            <ApplicantRow
              summary={c.summary}
              score={c.profileStrength}
              scoreLabel="profile"
              locale={locale}
              t={t}
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
              className="absolute inset-0 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="sr-only">{c.firstName}</span>
            </Link>
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
  );
}
