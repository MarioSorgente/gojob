# GoJob

A simple hospitality hiring marketplace for Bali. Post a job and instantly see
the most relevant available candidates — replacing Instagram DMs and WhatsApp
CVs with one clean flow: **post → match → invite → chat → interview → hire.**

All 33 MVP screens from the product scope are built.

## Documentation

| Doc | What's in it |
| --- | --- |
| [docs/STATUS.md](docs/STATUS.md) | **Where we are** — every screen vs. the scope, feature-by-feature |
| [docs/ROADMAP.md](docs/ROADMAP.md) | **What's missing** — honest gaps, risks, next milestones |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works and why — data model, matching, conventions |

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- **Firebase**: Authentication (email/Google/phone OTP), **Firestore** (data),
  Storage (uploads), realtime chat via `onSnapshot`
- Deterministic, unit-tested **matching engine** (no LLM) — scope §9
- Deploys to **Vercel**

## What it does

- **Candidates** build a profile (roles, area, salary, availability, languages,
  skills, experience), see ranked job recommendations, search/filter jobs, apply,
  accept invitations, chat, and schedule interviews. Always free.
- **Employers** create a venue, post a job and *immediately* get a ranked,
  explainable shortlist, screen candidates by swipe, search the whole talent pool,
  invite, chat on mutual match, schedule interviews, and mark hires.
- **Sharing** — every job has a public page with copy link / WhatsApp / Instagram
  / QR. A logged-out applicant is carried through signup and lands back on the job.
- **Admin** — verification queues, users, businesses, jobs, marketplace metrics.

## Prerequisites

- **Node.js 18+**
- **Java 11+** — required by the Firebase Emulator Suite (Firestore/Auth
  emulators run on a JVM). Install a JDK (e.g. Microsoft OpenJDK / Temurin) and
  make sure `java -version` works.
- **firebase-tools** — installed on demand via `npx`, or globally:
  `npm i -g firebase-tools`

## Local development (no real Firebase project needed)

Everything runs against the local **Firebase Emulator Suite** using a demo
project id (`demo-gojob`). No credentials required.

```bash
npm install
cp .env.example .env.local   # defaults already target the emulator
```

Then, in three terminals:

```bash
# 1) Firebase emulators (Auth + Firestore + Storage + UI on :4000)
npm run emulators
```

```bash
# 2) The Next.js app
npm run dev
```

```bash
# 3) Seed demo data (run once, after the emulators are up)
npm run seed
```

Open http://localhost:3000.

### Demo logins (password: `demo1234`)

| Role      | Email                    | Lands on   |
| --------- | ------------------------ | ---------- |
| Employer  | `owner@milkandmadu.demo` | `/employer` |
| Candidate | `ayu@gojob.demo`         | `/candidate` |
| Admin     | `admin@gojob.demo`       | `/admin`    |

### The demo story (scope §31)

1. Log in as the **employer** → **Post a Job** (Barista, Canggu, IDR 6–8M, 2
   years, English) → the job goes live and shows _N potential candidates match_.
2. Screen the recommended candidates (swipe or tap). **Invite** Ayu.
3. Log in as **Ayu** (candidate) → **Invites** → **Accept** → 🎉 _It's a Match_
   → chat opens.
4. Exchange messages, **Schedule Interview**, accept it.
5. Back as the employer → open the chat or the job's Matches → **Mark as Hired**.

You can also register brand-new employer/candidate accounts and go through
onboarding from scratch.

### Worth trying beyond the core loop

- **Share a job** — on the employer's job page tap **Share job** for the copy
  link / WhatsApp / QR sheet. Open that link in a private window (logged out) to
  see the public job page, then **Apply through GoJob** → it carries you through
  signup and onboarding and lands you back on the job.
- **Find Candidates** (employer → 🔍) — browse the whole pool without posting a
  job. Contact details stay hidden; the only action is Invite.
- **Search jobs** (candidate → 🔍) — filter by role/area/type/salary, still
  ranked by match score.
- **Verification** (candidate → Profile → Verification) — upload an ID, then log
  in as the **admin** to approve it in `/admin/verifications` and watch the
  candidate's Profile Strength rise.
- **Admin metrics** — `/admin` shows applications, matches, hires and
  matches-per-live-job.

## Testing & checks

```bash
npm run test        # Vitest — matching, profile strength, search filters
npm run typecheck   # tsc --noEmit across the whole project
npm run build       # production build
npm run lint        # eslint
```

Current state: **21 unit tests passing, typecheck clean, 34 routes building.**
See [docs/ROADMAP.md](docs/ROADMAP.md) for what testing is still missing (E2E,
server actions, security rules).

## Deploying to Vercel (with a real Firebase project)

1. Create a Firebase project; enable **Authentication** (Email/Password, Google,
   Phone), **Firestore**, and **Storage**. Under Authentication → Settings →
   **Authorized domains**, add your Vercel domain(s).
2. In Vercel → Settings → Environment Variables, add (Production, and Preview if
   used):

   **Client (from Firebase → Project settings → Your apps → SDK config):**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` = `0`

   **Server / Admin SDK (from Project settings → Service accounts → Generate new
   private key). Recommended: three separate variables:**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (paste the full key incl. BEGIN/END lines; literal
     `\n` are handled)

   Do **not** set any `*_EMULATOR_HOST` variables in production.
3. Deploy. Push the Firestore rules/indexes with
   `firebase deploy --only firestore,storage` when you're ready.

## Testing on the live site without real users

Your production Firestore starts empty, so post-a-job shows zero candidates.
Seed the same demo data (Milk & Madu + Ayu + 13 candidates + a live job) into
your **real** project:

1. Download a service-account key (Project settings → Service accounts →
   Generate new private key). Save it as `serviceAccount.json` in the project
   root — it's gitignored.
2. In `.env.local`, add: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`
3. Run:

   ```bash
   npm run seed:prod
   ```

   (It refuses to run unless it finds real credentials.) Then on the deployed
   site, open two browsers (or one + an incognito window) and log in as the
   employer and the candidate — password `demo1234`:
   - Employer `owner@milkandmadu.demo` → post a Barista job → invite Ayu
   - Candidate `ayu@gojob.demo` → accept the invite → chat → schedule interview
   - Employer → Mark as Hired

To wipe and reseed, delete the `candidates`, `businesses`, `jobs`, `users`
collections in the Firestore console and run `npm run seed:prod` again.

## Project structure

```
src/
  app/
    (public)         landing, /login, /register
    onboarding       role selection
    candidate/…      onboarding, jobs, applications, invitations, matches, chat, profile
    employer/…       onboarding, dashboard, create job, job pipeline, chat, venue
    api/session      Firebase ID token -> httpOnly session cookie
    _actions         shared server actions (chat)
  components/        UI kit, cards, swipe deck, chat, forms
  lib/
    matching.ts      deterministic scorer (+ matching.test.ts)
    profileStrength.ts
    taxonomy.ts      roles, areas, employment types, languages, skills
    firebase/        client + admin SDK wiring
    repos/           Firestore data access (server-only)
scripts/seed.ts      demo data for the emulator
firestore.rules · firestore.indexes.json · storage.rules · firebase.json
```

## What's in this milestone

**In:** auth (email/Google/phone) + role selection, candidate & employer
onboarding, profiles + profile strength, job creation, the deterministic
matching engine, recommended candidates (swipe) & recommended jobs, apply /
invite / mutual match, realtime chat, interview scheduling, hiring pipeline +
Mark as Hired, demo seed data.

**Deferred (later phases):** admin panel, ID/employment verification workflows,
payments, Instagram/WhatsApp/QR sharing, standalone employer candidate search.
