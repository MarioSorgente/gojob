/**
 * Low-cardinality telemetry for candidate search. Never add filter values,
 * query text, candidate ids, or user ids to this event.
 */
export interface CandidateSearchMetric {
  event: "candidate_search";
  documentsFetched: number;
  resultsReturned: number;
  fetchRounds: number;
  latencyMs: number;
  exhausted: boolean;
  usedIndexFallback: boolean;
  /** True when the safe fallback stopped before reading the whole collection. */
  fallbackBudgetExhausted: boolean;
  /** Filter names (never values) used to choose worthwhile query indexes. */
  activeFilters: (keyof import("./search").CandidateFilters)[];
  /** Names only make filter adoption observable without exposing values. */
  activeFilterCount: number;
}

export type CandidateSearchMetricRecorder = (
  metric: CandidateSearchMetric,
) => void;

let recorder: CandidateSearchMetricRecorder = (metric) => {
  console.info(JSON.stringify(metric));
};

export function recordCandidateSearch(metric: CandidateSearchMetric): void {
  recorder(metric);
}

/** Test/hosting adapter hook; reset by calling without an argument. */
export function setCandidateSearchMetricRecorder(
  next?: CandidateSearchMetricRecorder,
): void {
  recorder = next ?? ((metric) => console.info(JSON.stringify(metric)));
}
