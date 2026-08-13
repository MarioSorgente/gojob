# Candidate search scaling and external-index contract

Firestore remains the system of record. The current search emits one
`candidate_search` event per request with documents fetched, results returned,
fetch rounds, end-to-end latency, exhaustion, fallback use, and the number (not
values) of active filters. Do not add filter values, query text, cursors,
candidate IDs, or caller IDs to this event.

## Trigger for a dedicated service

Evaluate and capacity-test a dedicated search service (the initial selection is
Algolia) when **any** condition holds for 14 consecutive days, measured over at
least 10,000 searches:

* p95 `documentsFetched / max(resultsReturned, 1)` is at least **20**;
* p95 search latency is at least **750 ms**;
* at least **5%** of searches consume all **5 fetch rounds** without filling a
  page (an exhausted source with fewer than a page is not a round-budget hit);
* the candidate collection reaches **100,000 documents**; or
* missing-index fallback occurs in at least **0.1%** of searches after an index
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
