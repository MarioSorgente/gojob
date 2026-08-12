# GoJob — Architecture

_Last updated: 2026-08-12_

How the pieces fit together, and why the non-obvious decisions were made.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 (CSS-based config in `globals.css`) |
| Auth | Firebase Authentication — email/password, Google, phone OTP |
| Database | Cloud Firestore (NoSQL) |
| Files | Firebase Storage |
| Realtime | Firestore `onSnapshot` (chat) |
| Hosting | Vercel |
| Tests | Vitest (unit) |

---

## Request flow

```
Browser ──sign in (Firebase JS SDK)──► Firebase Auth
   │
   └─ POST /api/session { idToken }
          │
          ▼
   Admin SDK verifies token → httpOnly session cookie (gojob_session, 5 days)
          │
          ▼
   Server Components / Server Actions
     requireUser() / requireRole() → verifySessionCookie()
          │
          ▼
   Repos (src/lib/repos/*, "server-only") → Firestore via Admin SDK
```

**All privileged reads and writes happen on the server** through the Admin SDK,
which bypasses security rules. The client SDK is trusted with only two things:
signing in, and subscribing to chat messages in a conversation it belongs to.
`firestore.rules` is written to match that: deny everything, then re-open the
narrow slices the browser genuinely needs.

`middleware.ts` only checks that the session **cookie exists** — the Admin SDK
can't run on the Edge runtime, so real verification happens in the Node-runtime
server components via `requireRole()`. Middleware is a cheap early redirect, not
the security boundary.

---

## Data model (Firestore)

Firestore is a document store, so the scope's relational entities are adapted
with embedded arrays and deliberate denormalization instead of join tables.

```
users/{uid}                     role, email, phone, onboardingComplete
candidates/{uid}                profile + roles[] + skills[] + languages[]
                                + experiences[] + verification{} + profileStrength
businesses/{businessId}         venue, links, verificationStatus
jobs/{jobId}                    role, area, salary, skills[], languages[], status
  └── shortlist/{candidateId}   ⭐ the (job, candidate) pair — see below
matches/{matchId}               created on mutual interest
conversations/{conversationId}  participants[], lastMessage, unread{uid:n}
  └── messages/{messageId}      senderId, body, createdAt, readAt
interviews/{interviewId}        date, time, location, status
hires/{hireId}                  jobId, candidateId, businessId, date
skills/{skillId}                seeded reference data
```

### The shortlist subcollection is the heart of the system

`jobs/{jobId}/shortlist/{candidateId}` collapses four entities from the scope —
`CandidateJobMatch`, `Application`, `Invitation`, and `Match` — into one document
per (job, candidate) pair:

```ts
{ score, breakdown{…}, reasons[],
  employerAction: none|passed|saved|invited,
  candidateAction: none|applied|passed,
  stage: recommended|applied|matched|interview|hired|rejected,
  matchId, conversationId,
  candidateSummary{…}   // denormalized for fast card rendering
}
```

**Why:** every screen in the product is a different view of this one row. The
swipe deck reads `employerAction === "none"`; Applications reads
`candidateAction === "applied"`; the pipeline groups by `stage`. Mutual matching
becomes a single-document check rather than a cross-collection join — which
Firestore can't do anyway.

`candidateSummary` is denormalized so a shortlist renders from one query instead
of N candidate lookups. The tradeoff: it goes stale if a candidate edits their
profile. It's refreshed whenever the shortlist regenerates. (See
[ROADMAP](./ROADMAP.md) item 4.)

Named `shortlist` rather than `candidates` on purpose — a `collectionGroup`
query on `candidates` would otherwise collide with the top-level collection.

---

## Matching engine

`src/lib/matching.ts` is a **pure function** — no I/O, no LLM, fully
deterministic and unit-tested:

```
computeMatch(job, candidate) → { score, breakdown, reasons[] }

0.30 role  ·  0.20 experience  ·  0.15 skills  ·  0.10 salary
0.10 location  ·  0.10 availability  ·  0.05 profile strength
```

Design rules worth preserving:

- **Explainable by construction.** Every sub-score contributes a human-readable
  reason. An employer can always see *why* someone ranks where they do — the
  scope calls this out, and it's what makes the shortlist trustworthy.
- **Absent data is neutral, not punishing.** A job listing no skills scores
  100% on skills; incompatible salary types score 0.6 rather than 0.
- **Nearby areas get partial credit** via `AREA_CLUSTERS` in `taxonomy.ts`
  (Canggu/Berawa/Umalas commute together; Jimbaran/Nusa Dua/Ungasan do too).
- **Deliberately not an LLM** (scope §29). AI belongs in CV parsing and
  description polish, never in the ranking that decides who gets seen.

The same function powers both directions: employer shortlists and the
candidate's recommended jobs.

---

## Why lazy Firebase initialization

Both `src/lib/firebase/client.ts` and `admin.ts` initialize **on first use**,
never at module load.

This isn't stylistic — eager init took production down twice:

1. `/login` and `/register` are statically prerendered. They import the auth
   client, so `getAuth()` ran **at build time**. With `NEXT_PUBLIC_FIREBASE_API_KEY`
   unset in Vercel it threw `auth/invalid-api-key` and failed the entire build.
2. The Admin SDK parsed its service account at module load. A malformed
   base64 `FIREBASE_SERVICE_ACCOUNT_KEY` threw inside `JSON.parse` while Next
   was collecting page data for `/api/session`, again failing the build.

With lazy init, a bad or missing credential degrades to a runtime error on the
one request that needs it — the site still builds and every page that doesn't
touch Firebase still serves. **Keep it that way.**

`src/lib/firebase/credentials.ts` resolves credentials from (in order): the
three-variable form (`FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY`,
recommended — no base64 mangling), a raw-or-base64 service-account JSON, the
emulator, then application default credentials. It normalizes escaped `\n` in
private keys, which is the single most common Vercel paste error.

---

## Why the production build uses webpack, not Turbopack

`npm run build` runs `next build --webpack`. This is a workaround, not a
preference — remove it once the upstream Turbopack bug is fixed.

Next 16 builds with Turbopack by default, and Turbopack loads server-external
packages (`firebase-admin` is on Next's default externals list) through its own
CJS shim rather than letting Node resolve them. On Vercel that shim fails:

```
Failed to load external module firebase-admin-a14c8a5423a75469/auth:
  ERR_REQUIRE_ESM: require() of ES Module …/jose/dist/webapi/index.js
  from …/jwks-rsa/src/utils.js not supported
  at Context.externalImport (.next/server/chunks/ssr/[turbopack]_runtime.js)
```

The chain is `firebase-admin` → `jwks-rsa` (CJS, `require('jose')`) → `jose@6`,
which is pure ESM: `"type": "module"`, and its `exports` map has no `require`
condition.

This is **not** a dependency problem. Node 22.12+/24 natively supports
`require()` of ESM without top-level await, and on plain Node 24
`require('firebase-admin/auth')` succeeds. Only Turbopack's shim fails, and only
in the Vercel lambda — a local `next build` + `next start` with Turbopack serves
these routes fine, which is why this reached production undetected. It took down
every server route that touches Firebase: login, both dashboards, admin, all of
it. Webpack emits a plain `require()` that Node executes itself, so the native
`require(esm)` support applies and the chain loads.

See vercel/next.js#87737 and #87686 for the wider class of Turbopack
external-module failures.

---

## Conventions

- **`"server-only"`** at the top of every repo module — importing one into a
  client component is a build error, not a runtime leak.
- **Server actions** live beside the routes that use them (`actions.ts`), and
  every one re-checks `requireRole()`. Never trust the client's claim of
  identity or ownership; `assertOwnsJob()` guards employer mutations.
- **Dates are ISO strings**, not Firestore `Timestamp`s, so the Admin SDK,
  client SDK, and seed script all agree without conversion code.
- **Taxonomy is TypeScript constants** (`taxonomy.ts`), not database rows —
  one source of truth shared by forms, filters, and the matcher. Only the skills
  list is additionally seeded into Firestore.
- **Filters live in the URL** so result pages are shareable and survive refresh,
  and the server component reads them directly.
- **Money is stored as integer IDR**; formatting (`IDR 6–7M`) happens only at
  the display layer in `cn.ts`.
- **No webfonts.** Typography uses the native system stack. `next/font/google`
  fetches at build time, so a font-CDN hiccup could fail a deploy — it did here.
  It also removes a render-blocking request, which matters on Bali mobile data.

---

## Local development

The Firebase **Emulator Suite** (Auth + Firestore + Storage) means no real
credentials are needed to develop. `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1` points
both SDKs at localhost; the project id `demo-gojob` keeps the emulator fully
offline.

**The emulator requires Java 11+.** Without a JDK, `npm run emulators` will not
start — use `npm run seed:prod` against a real Firebase project instead
(see the [README](../README.md)).
