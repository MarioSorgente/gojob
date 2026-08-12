# GoJob — What's Missing

_Last updated: 2026-08-12_

Companion to [STATUS.md](./STATUS.md). All 33 MVP screens exist; this is an
honest list of what is thin, missing, or would break under real usage —
roughly in the order it should be tackled.

---

## Must fix before real users

Ordered by risk. These are the things that would actually hurt.

### 1. No rate limiting or abuse controls 🔴
Nothing stops a script from creating accounts, spamming invitations, or flooding
chat. Server actions authenticate the caller but never throttle.
**Fix:** per-uid rate limits on `sendMessage`, invite, and apply (Upstash
Redis or Firestore counters), plus App Check on the client SDK.

### 2. Search doesn't scale 🔴
`searchCandidates` / `searchJobsForCandidate` read the whole collection and
filter in memory (`src/lib/search.ts`). Fine for hundreds of records; at a few
thousand it gets slow and expensive, and Firestore reads are billed per document.
**Fix:** move to Algolia/Typesense, or precompute filter fields + composite
indexes and paginate. Cursor-based pagination is missing everywhere too — every
list renders its full result set.

### 3. Shortlist generation is synchronous and unbounded 🟠
Publishing a job scores every role-matching candidate in one request and writes
them in a single `batch()`. Firestore batches cap at **500 writes**, so a job
matching more than 500 candidates will throw.
**Fix:** chunk the batch, and move generation to a background job (Cloud Task /
queue) with the UI polling for readiness.

### 4. No re-matching when data changes 🟠
The shortlist is computed at publish time only. If a candidate signs up or
updates their profile afterwards, they never appear for existing jobs.
**Fix:** a Cloud Function on candidate write that upserts shortlist rows for
live jobs, or a scheduled nightly re-score.

### 5. Storage rules trust the client path 🟠
`storage.rules` scopes uploads to `users/{uid}/...`, but nothing validates that
the URL a client sends to `updatePhotoAction` is actually one of *their*
uploads — a user could pass any URL string.
**Fix:** validate the URL's path prefix server-side before persisting.

### 6. No tests above the unit level 🟠
21 unit tests cover matching, profile strength, and search predicates. There is
**no** coverage of server actions, the mutual-match state machine, or any UI.
The match/invite/hire flow has only ever been verified by hand.
**Fix:** Playwright E2E against the emulator for the demo story, plus
integration tests for `pipeline.ts` (the trickiest logic in the codebase).

### 7. Firestore rules are barely tested 🟡
Rules exist and are deliberately restrictive (server does privileged work via
the Admin SDK), but there are no `@firebase/rules-unit-testing` specs proving a
candidate can't read another candidate's profile.

---

## Known gaps in what's built

Things that work but are shallower than they look.

| Area | Gap |
| --- | --- |
| **Interviews** | No calendar integration, no reminders, no reschedule — propose/accept/decline only (scope explicitly allowed this). |
| **Chat** | Text only. No images, attachments, typing indicators, or push notifications. Unread counts don't drive any notification. |
| **Notifications** | None at all — no email, no push, no SMS. A candidate only learns about an invitation by opening the app. **This is the biggest product gap.** |
| **CV parsing / AI** | Scope §29 lists CV parsing, title normalization, skill extraction, and description improvement as MVP AI tasks. None are built. (Correctly, matching itself stays LLM-free.) |
| **Employer teams** | One user per business, per scope §2. Deliberate. |
| **Job editing** | Jobs can be created and closed but not edited after publishing. |
| **Candidate deletion** | No account deletion or data export — a GDPR/PDP concern before launch. |
| **Saved candidates** | "Save" is recorded on the shortlist row but there's no cross-job saved list. |
| **i18n** | English only. `user.language` exists in the model but nothing reads it. Bahasa Indonesia matters for the candidate side. |
| **Accessibility** | Not audited. The swipe deck is pointer-driven with button fallbacks, but focus management and screen-reader labelling need a pass. |
| **Analytics** | No event tracking, so funnel drop-off is invisible. |

---

## Deferred by scope (§27) — do not build yet

Business teams · multiple hiring managers · enterprise permissions ·
multi-location management · complex ATS · payroll · shift management ·
social feed · followers · endorsements · candidate reviews · AI background
checks · criminal screening · automated reference calls · video interviews ·
AI interview scoring · advanced analytics · candidate premium plans ·
employer CRM · complex subscription limits · native mobile app.

---

## Suggested next milestones

**Milestone 1 — Make it safe to let people in**
Rate limiting + App Check · batch chunking · server-side URL validation ·
Playwright E2E of the demo story · pagination on every list.

**Milestone 2 — Make it sticky**
Email/push notifications for invitations, matches, and messages (the single
highest-leverage addition) · re-matching on profile change · job editing ·
Bahasa Indonesia.

**Milestone 3 — Make it a business**
Stripe/Xendit behind the existing plans UI · usage metering for Pay per Job vs
Pro · funnel analytics · admin cohort views.

**Milestone 4 — Make it smarter**
CV upload + parsing to prefill profiles · job-title normalization · skill
extraction · AI-assisted job descriptions. Matching stays deterministic.
