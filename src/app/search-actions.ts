"use server";

/**
 * Paged fetches behind the "Load more" buttons.
 *
 * Each re-checks the caller's role and re-derives identity from the session —
 * the client supplies filters and a cursor, never who it is or what it may see.
 */

import { requireRole } from "@/lib/auth";
import {
  getCandidate,
  searchCandidatesPage,
  toCandidateSummary,
} from "@/lib/repos/candidates";
import { recommendedJobsPage } from "@/lib/repos/jobs";
import type { CandidateFilters, JobFilters } from "@/lib/search";
import type {
  CandidateResult,
  JobResult,
  PagedResult,
} from "@/lib/searchResults";

export async function loadCandidatesPageAction(
  filters: CandidateFilters,
  cursor: string | null,
): Promise<PagedResult<CandidateResult>> {
  await requireRole("employer");
  const page = await searchCandidatesPage(filters, cursor);
  return {
    items: page.items.map((c) => ({
      userId: c.userId,
      firstName: c.firstName,
      profileStrength: c.profileStrength,
      summary: toCandidateSummary(c),
    })),
    nextCursor: page.nextCursor,
  };
}

export async function loadJobsPageAction(
  filters: JobFilters,
  cursor: string | null,
): Promise<PagedResult<JobResult>> {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) return { items: [], nextCursor: null };

  const page = await recommendedJobsPage(candidate, filters, cursor);
  return {
    items: page.items.map((r) => ({
      job: r.job,
      score: r.score,
      reasons: r.reasons,
      breakdown: r.breakdown,
    })),
    nextCursor: page.nextCursor,
  };
}
