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

### 2. Search reads are bounded, but ranking still isn't ✅🟡
**Done:** lists page with opaque cursors (`src/lib/pagination.ts`), and
candidate search pushes its most selective filter into Firestore, over-fetching
to fill a page after the residual in-memory predicates run. Reads now scale with
the page rather than the collection.

**Still open:** Firestore allows one `array-contains` per query and can't order
by `profileStrength` while filtering an inequality, so the remaining filters
(experience, salary, language level, free text) run in memory — pushing them all
down would need a composite index per filter combination. Job ranking is worse:
match scores are per-candidate, so Firestore can't sort them at all. The
candidate feed ranks a capped window (`MAX_RANKED_JOBS`, 500 newest live jobs)
and pages the ranked array. **Fix at scale:** a search service that can sort by a
stored score (Algolia/Typesense).

### 3. Shortlist generation is chunked and off the request ✅
**Done:** writes are chunked below Firestore's 500-op batch cap
(`src/lib/chunk.ts`), and publishing a job now returns immediately — generation
runs in `after()`, the job carries `shortlistStatus`, and the job page polls
until it's ready or reports failure.

**Note:** `after()` extends the same serverless invocation rather than being a
true queue, so a pool large enough to exceed the function timeout would still be
cut short (the job is marked `failed`, and the nightly re-score repairs it). A
real queue (Cloud Tasks) is the next step if pools get that big.

### 4. Re-matching when data changes ✅
**Done:** `src/lib/repos/rematch.ts` re-scores a candidate across every live job
matching their roles, run from profile saves and admin verification decisions,
plus a nightly sweep at `/api/cron/rescore` as a backstop. Rows the candidate is
no longer eligible for are removed **only** when untouched — anything carrying
pipeline state is kept, so removing a role can't destroy a live conversation.
Implemented in-app rather than as a Cloud Function to avoid a second deploy
target; move it to a Firestore trigger if writes start arriving from outside
this app.

### 5. Storage references are validated server-side ✅
**Done:** `src/lib/storagePaths.ts` re-derives the object path from a download
URL or raw path and asserts the `users/{uid}/{public|private}/` prefix, enforced
in the photo, ID-document and logo actions. Covers cross-user paths, wrong
scope, uid prefix collisions, traversal, and off-site URLs.

### 6. Tests above the unit level ✅🟡
**Done:** 92 tests. `pipeline.ts` and `rematch.ts` now have integration coverage
against an in-memory Firestore double (`src/lib/repos/testing/fakeFirestore.ts`)
— the full apply/invite/match/hire state machine, including idempotency and the
two Apply/Pass regressions.

**Still open:** no browser-level E2E. Playwright against the emulator is the
right next step, but the emulator needs a JVM, which is why the double exists.
No UI component tests.

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
Rate limiting + App Check · ~~batch chunking~~ ✅ · ~~server-side URL
validation~~ ✅ · ~~pagination on every list~~ ✅ · Playwright E2E of the demo
story (still outstanding — needs a JVM for the emulator).

**Milestone 2 — Make it sticky**
Email/push notifications for invitations, matches, and messages (the single
highest-leverage addition) · ~~re-matching on profile change~~ ✅ · job editing ·
Bahasa Indonesia.

**Milestone 3 — Make it a business**
Stripe/Xendit behind the existing plans UI · usage metering for Pay per Job vs
Pro · funnel analytics · admin cohort views.

**Milestone 4 — Make it smarter**
CV upload + parsing to prefill profiles · job-title normalization · skill
extraction · AI-assisted job descriptions. Matching stays deterministic.
