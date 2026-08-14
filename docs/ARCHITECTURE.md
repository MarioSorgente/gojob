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

1. `/login` and `/register` were statically prerendered at the time. They import the auth
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

## Why `jose` is pinned to v5

`package.json` carries an override:

```json
"overrides": { "jose": "^5.10.0" }
```

Removing it takes production down completely. Every server route that touches
Firebase — login, both dashboards, admin, the session endpoint — fails with:

```
ERR_REQUIRE_ESM: require() of ES Module …/jose/dist/webapi/index.js
  from …/jwks-rsa/src/utils.js not supported
```

The chain is `firebase-admin` → `jwks-rsa` (CommonJS, calls `require('jose')`) →
`jose@6`, which is **ESM-only**: `"type": "module"`, and its `exports` map has no
`require` condition at all. jose v5 ships a real CJS build
(`dist/node/cjs/index.js`) behind a `require` condition, which is the entire
difference.

**Why this hides in development.** Node 22.12+/24 natively supports `require()`
of ESM that has no top-level await, so on a normal Node 24 the whole chain loads
happily — locally, in `next dev`, and in `next build` + `next start`. Vercel's
Node runtime patches `Module._load`, and that patched loader does not honour
native require(esm). So the failure appears *only* in the deployed lambda.

Reproduce the production condition locally with the flag that disables the same
feature:

```bash
node --no-experimental-require-module -e "require('firebase-admin/auth')"
```

`src/lib/firebase/adminDeps.test.ts` runs exactly that in CI, so a transitive
bump that reintroduces an ESM-only jose fails a test instead of a deploy.

**Is the override safe?** `jose` has exactly one dependent in the tree
(`jwks-rsa`), which uses four stable APIs: `decodeJwt`, `decodeProtectedHeader`,
`importJWK`, `exportSPKI`. All four exist in v5 with the same signatures and are
verified working. The override is a semver lie — jwks-rsa asks for `^6.1.3` —
so drop it once `jwks-rsa` either switches to `import()` or ships a CJS-safe
jose. There is no newer `jwks-rsa`: 4.1.0 is latest and 4.0.x pins jose ^6 too.

## Why the production build uses webpack, not Turbopack

`npm run build` runs `next build --webpack`, pinned again in `vercel.json` so it
can't depend on the host preferring the package.json script over its own
framework default.

Honest status: this was introduced as a fix for the ERR_REQUIRE_ESM above and
**did not fix it** — the same error came back from Vercel's own loader
(`/opt/rust/nodejs.js`) once Turbopack's shim was out of the picture. The jose
override is the actual fix. Webpack is kept only because Turbopack has a
documented class of external-module failures (vercel/next.js#87737, #87686) and
this deployment is known-good on webpack. It is a candidate for removal once
production has been verified stable — try it deliberately, not incidentally.

---

## Why auth transitions are a full page load

`AuthForm` and `LogoutButton` navigate with `window.location.assign()`, not
`router.push`/`replace`. This is deliberate, and the Next lint rule that objects
to it is suppressed at both sites with a comment.

Signing in or out changes what **every** server component renders. A soft
navigation leaves the pre-transition RSC payloads in the client Router Cache,
and Next restores those on Back/Forward regardless of staleness. The symptom was
a bug report: *"if I log in and go back in the page it logs out."* The session
cookie was intact the whole time — the user was looking at a cached copy of the
landing page rendered before they signed in, which still said "Log in".

Three things together fix that class of bug:

1. `/`, `/login` and `/register` call `getSessionUser()`, so they render per
   request instead of being prerendered once for everybody. `/login` and
   `/register` also redirect an already-authenticated visitor to `homePathFor()`
   — the reverse of what middleware does.
2. Auth transitions are a full load, which discards the Router Cache entirely.
   It costs one page load on a once-per-session event.
3. `middleware.ts` sends `Cache-Control: no-store` on its redirect, so the 307
   itself cannot be replayed after the cookie exists. `BfcacheGuard` reloads on
   `pageshow`/`persisted` for browsers that bfcache a `no-store` response.

---

## i18n: display layer only

English and Bahasa Indonesia, in `src/lib/i18n/`. No dependency —
`next-intl` would force a `/[locale]/…` restructure that collides with
`middleware.ts`, and the app is overwhelmingly server components.

- `en.ts` is the canonical key set; `id.ts` is typed as `Dictionary`, so a new
  key fails the typecheck until it is translated. `i18n.test.ts` covers what a
  type cannot: empty values, dropped `{placeholders}`, untranslated leftovers.
- Server components call `await getT()`. Client components use `useT()`, and the
  provider receives only the namespaces they need (`clientSlice`), so the RSC
  payload carries a fraction of the dictionary.
- Locale resolution: `gojob_lang` cookie → `users.language` → `Accept-Language`
  → `en`. The cookie is what lets logged-out visitors on the landing and public
  job pages pick a language.

**Taxonomy values in `src/lib/taxonomy.ts` are never translated.** They are
stored in Firestore, and they are match keys and query values — `role: "Barista"`,
`employmentType: "Full-time"`. `i18n/taxonomy.ts` is a render-time lookup:
`<option value>` keeps the canonical English and only the visible text changes.
Matching, `firestore.indexes.json` and every repo query are untouched by
language. Area names are proper nouns and pass through unchanged.

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
