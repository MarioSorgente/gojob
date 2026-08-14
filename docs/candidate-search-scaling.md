# Candidate search scaling and external-index contract

Firestore remains the system of record. Normalized searches with no residual
predicate use a `pageSize + 1` query rather than filtered over-fetching. The two
selected query shapes are `(profileStrength DESC, userId DESC)` and `roles
array-contains + (profileStrength DESC, userId DESC)`. Role is the only pushed
filter because it is both the most-used and most-selective safe exact predicate
in current telemetry; do not create an index for every UI permutation. Review
the `activeFilters` distribution and documents-fetched/result ratio before
promoting another filter. Equal strengths are ordered by the unique `userId`
tie-breaker, which must also be present in every cursor and composite index.

The current search emits one
`candidate_search` event per request with documents fetched, results returned,
fetch rounds, end-to-end latency, exhaustion, fallback use, and the number (not
values) and names of active filters. Dashboards must chart fallback rate,
`fallbackBudgetExhausted`, documents fetched, and the fraction reaching the
five-round threshold. Do not add filter values, query text, cursors,
candidate IDs, or caller IDs to this event.

## Missing-index degradation

The index fallback is capped by `CANDIDATE_SEARCH_FALLBACK_READ_BUDGET`
(default 500). It requests one extra document to detect that the collection is
larger than the budget. On exhaustion it filters and ranks only the bounded
sample, returns no continuation cursor (so callers cannot mistake it for a
complete traversal), sets `fallbackBudgetExhausted`, and emits an operational
error. Alert immediately on any exhaustion and on a fallback rate of 0.1%; the
fallback is deployment protection, not a steady-state query plan.

## Trigger for a dedicated service

Evaluate and capacity-test a dedicated search service (the initial selection is
Algolia) when **any** condition holds for 14 consecutive days, measured over at
least 10,000 searches:

- p95 `documentsFetched / max(resultsReturned, 1)` is at least **20**;
- p95 search latency is at least **750 ms**;
- at least **5%** of searches consume all **5 fetch rounds** without filling a
  page (an exhausted source with fewer than a page is not a round-budget hit);
- the candidate collection reaches **100,000 documents**; or
- missing-index fallback occurs in at least **0.1%** of searches after an index
  deployment window.

Alert at 80% of a threshold. Validate cost, relevance, deletion propagation,
and regional/data-processing requirements before activation.

## Migration contract

When a trigger is sustained, generate `CandidateSearchProjection` documents on
candidate create/update and delete them on candidate deletion. Backfill the
same versioned projection into Algolia, then compare shadow queries before
routing traffic. The projection contains only fields required by the existing
filters and ranking; Firestore credentials and identity documents are never
indexed.

Algolia returns ordered candidate IDs only. The request must authorize the
employer before hydration. Batch-read those IDs from Firestore, drop deleted or
inaccessible records, preserve result order, and build cards exclusively from
the freshly read profiles. Index copies of names, photos, verification, or
other display fields are never authoritative. Continue writing candidate
changes to Firestore first; indexing is retryable asynchronous derived-data
work. Projection schema changes require a new version/index and atomic alias
switch after backfill.
