# GoJob — Project Status

_Last updated: 2026-08-12_

This document tracks the build against **GoJob — MVP Product Scope v0.1**.
For what's still outstanding and in what order, see [ROADMAP.md](./ROADMAP.md).
For how the pieces fit together, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## TL;DR

The **full core marketplace loop works end to end**:

> post a job → instantly see a ranked, explainable shortlist → invite →
> candidate accepts → it's a match → chat → schedule interview → mark as hired

On top of that loop, the acquisition path (public job pages + Instagram/WhatsApp/
QR sharing), both search experiences, light verification with an admin review
queue, and the monetization UI are in place.

| Check | Status |
| --- | --- |
| `npm run typecheck` | ✅ clean |
| `npm run test` | ✅ 21/21 passing (3 files) |
| `npm run build` | ✅ 34 routes |
| Deployed on Vercel | ✅ (needs env vars — see [README](../README.md)) |

**Not production-ready yet.** The gaps that matter are listed in
[ROADMAP.md](./ROADMAP.md#must-fix-before-real-users) — most notably rate
limiting, in-memory search that won't scale past a few thousand candidates, and
no automated tests above the unit level.

---

## Screens: scope §26 vs. built

### Public

| # | Screen | Status | Route |
| --- | --- | --- | --- |
| 1 | Landing page | ✅ | `/` |
| 2 | Job public page | ✅ | `/jobs/[jobId]` |
| 3 | Login | ✅ | `/login` |
| 4 | Registration | ✅ | `/register` |

### Candidate

| # | Screen | Status | Route |
| --- | --- | --- | --- |
| 5 | Candidate onboarding | ✅ | `/candidate/onboarding` |
| 6 | Candidate profile | ✅ | `/candidate/profile` |
| 7 | Profile Strength | ✅ | on profile + `/candidate/verification` |
| 8 | Job recommendations | ✅ | `/candidate` |
| 9 | Job search | ✅ | `/candidate/search` |
| 10 | Job detail | ✅ | `/candidate/jobs/[jobId]` |
| 11 | Applications | ✅ | `/candidate/applications` |
| 12 | Invitations | ✅ | `/candidate/invitations` |
| 13 | Matches | ✅ | `/candidate/matches` |
| 14 | Chat | ✅ | `/candidate/chat/[conversationId]` |
| 15 | Interview | ✅ | inside chat |

### Employer

| # | Screen | Status | Route |
| --- | --- | --- | --- |
| 16 | Employer onboarding | ✅ | `/employer/onboarding` |
| 17 | Business profile | ✅ | `/employer/business` (+ `/edit`) |
| 18 | Employer dashboard | ✅ | `/employer` |
| 19 | Create job | ✅ | `/employer/jobs/new` |
| 20 | Job detail | ✅ | `/employer/jobs/[jobId]` |
| 21 | Recommended candidates | ✅ | swipe deck on job detail |
| 22 | Applicants | ✅ | pipeline on job detail |
| 23 | Candidate search | ✅ | `/employer/candidates` |
| 24 | Candidate profile | ✅ | `/employer/candidates/[candidateId]` |
| 25 | Matches | ✅ | `/employer/matches` |
| 26 | Chat | ✅ | `/employer/chat/[conversationId]` |
| 27 | Interview | ✅ | inside chat |

### Admin

| # | Screen | Status | Route |
| --- | --- | --- | --- |
| 28 | Users | ✅ | `/admin/users` |
| 29 | Businesses | ✅ | `/admin/businesses` |
| 30 | Candidate verification | ✅ | `/admin/verifications` |
| 31 | Business verification | ✅ | `/admin/verifications` + `/admin/businesses` |
| 32 | Jobs | ✅ | `/admin/jobs` |
| 33 | Basic marketplace metrics | ✅ | `/admin` |

**33 / 33 MVP screens exist.** Depth varies — see ROADMAP for what's thin.

---

## Feature notes by scope section

### §3–4 Candidate profile & Profile Strength ✅
Full onboarding: basic info, area (manual, no GPS), desired roles, employment
types, salary expectation (monthly/daily/hourly), availability, languages +
proficiency, skills (suggested by role + custom), and multiple experiences.
Profile Strength is an 8-item weighted checklist recomputed **server-side** on
every write, so it can never drift from the data.

### §5 Verification ✅ (light, as specified)
- **Phone** — verified implicitly by phone OTP sign-in.
- **ID** — optional upload to Firebase Storage (private path), status
  `not_submitted → pending → verified/rejected`, decided by an admin.
- **Employment** — candidate requests verification per experience; admin decides.
- **Business** — auto-verified when a Google Maps link or website is supplied,
  otherwise requestable and manually reviewed.
Unverified users can still do everything; verification only lifts strength/ranking.

### §7–9 Job creation & matching ✅
Publishing a job immediately scores every role-matching candidate and writes a
ranked shortlist. The engine is **deterministic — no LLM** (scope §9):

```
30% role · 20% experience · 15% skills · 10% salary
10% location · 10% availability · 5% profile strength
```

Every card shows *why* it matched ("✓ Barista", "✓ Salary within your budget",
"✓ Located in Berawa"). Nearby-area clusters give partial location credit.
Covered by unit tests in `src/lib/matching.test.ts`.

### §10–13 Shortlist, swipe & mutual matching ✅
Swipe deck with drag gestures plus always-present Pass / Save / Invite buttons.
Chat opens **only on mutual interest**, from either direction (candidate applies
→ employer invites, or employer invites → candidate accepts). Both paths land on
the same "It's a Match" celebration.

### §14–17 Chat, interviews, pipeline, hire ✅
Realtime chat via Firestore `onSnapshot` with unread counts. Interview propose /
accept / decline. Pipeline stages (recommended → applied → matched → interview →
hired / rejected) and a `hires` record on Mark as Hired.

### §18 Employer candidate search ✅
Filter by role, area, experience, salary, availability, employment type,
language + minimum level, and ID-verification. **Contact details are hidden** —
the only action is Invite, and messaging waits for the candidate to accept.

### §19 Candidate job discovery ✅
Recommended jobs (ranked) plus a search screen with role/area/employment
type/salary filters. Filters live in the URL, so results are shareable.

### §20 Instagram acquisition ✅
Every job has a public, unauthenticated page with proper OpenGraph metadata, and
a Share sheet offering copy link, WhatsApp, native/Instagram share, and a
printable **QR code**. A logged-out visitor who taps Apply is carried through
registration and onboarding and lands **back on the job** — replacing
"DM us your CV" with "Apply through GoJob".

### §21–22 Monetization ✅ (UI only, by design)
`/employer/plans` presents Pay per Job and GoJob Pro. Deliberately no metering
and no payment provider — scope says billing must not block the marketplace.
Candidates are free everywhere, with no upsells.

---

## What was built beyond the MVP scope

Small additions that make the product usable rather than merely complete:

- **Toasts** for immediate action feedback.
- **Loading skeletons** on the data-heavy routes.
- **Photo & logo uploads** to Firebase Storage — candidate cards look real.
- **Admin job open/close** control.
- **`npm run seed:prod`** to populate a live Firebase project for testing
  without recruiting real users.
- **Hardened boot path** — Firebase client *and* Admin SDKs initialize lazily,
  so a missing or malformed env var surfaces as a runtime error on one request
  instead of failing the whole Vercel build. (This was a real outage; see
  [ARCHITECTURE.md](./ARCHITECTURE.md#why-lazy-firebase-initialization).)
