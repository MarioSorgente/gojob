# GoJob

A simple hospitality hiring marketplace for Bali. Post a job and instantly see
the most relevant available candidates — replacing Instagram DMs and WhatsApp
CVs with one clean flow: **post → match → invite → chat → interview → hire.**

This repo is the **MVP foundation + end-to-end demo loop**.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- **Firebase**: Authentication (email/Google/phone OTP), **Firestore** (data),
  Storage (uploads), realtime chat via `onSnapshot`
- Deterministic, unit-tested **matching engine** (no LLM) — scope §9
- Deploys to **Vercel**

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

| Role      | Email                    |
| --------- | ------------------------ |
| Employer  | `owner@milkandmadu.demo` |
| Candidate | `ayu@gojob.demo`         |

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

## Testing & checks

```bash
npm run test        # Vitest — matching engine + profile strength
npm run typecheck   # tsc --noEmit across the whole project
npm run build       # production build
npm run lint        # eslint
```

## Deploying to Vercel (with a real Firebase project)

1. Create a Firebase project; enable **Authentication** (Email/Password, Google,
   Phone), **Firestore**, and **Storage**.
2. In Vercel, set environment variables from `.env.example`:
   - `NEXT_PUBLIC_FIREBASE_*` — your web app config
   - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=0`
   - `FIREBASE_SERVICE_ACCOUNT_KEY` — base64-encoded service-account JSON (for
     the Admin SDK), and **remove** the `*_EMULATOR_HOST` variables
3. Deploy. Push the Firestore rules/indexes with
   `firebase deploy --only firestore,storage` when you're ready.

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
