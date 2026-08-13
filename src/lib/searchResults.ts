/**
 * Serializable shapes crossing the server/client boundary for paged lists.
 *
 * Kept out of the "use server" module, which may only export async functions,
 * and out of the repos, which are server-only — the client components that
 * render these pages need the types.
 */

import type { CandidateSummary, Job, MatchBreakdown } from "./types";

export interface CandidateResult {
  userId: string;
  firstName: string;
  profileStrength: number;
  summary: CandidateSummary;
}

export interface JobResult {
  job: Job;
  score: number;
  reasons: string[];
  /** Carried so the card's score can explain itself without another fetch. */
  breakdown: MatchBreakdown;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
}
