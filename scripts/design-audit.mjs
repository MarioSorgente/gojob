/**
 * Structural design audit against the running app.
 *
 * Signs in as each demo role, walks every route, and asserts the things that
 * only show up in rendered HTML — dead click targets, dialogs that render
 * inline, unlabelled controls, missing landmarks, undersized touch targets.
 *
 * Complements `src/components/designRules.test.ts`, which guards the same rules
 * at the source level with no server required.
 *
 *   npm run emulators   # terminal 1
 *   npm run dev         # terminal 2
 *   npm run seed        # once
 *   npm run design:audit
 *
 * Exits non-zero when anything at MED or above is found, so CI can gate on it.
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const BASE = process.env.BASE ?? "http://localhost:3000";
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key";

const PERSONAS = [
  {
    name: "candidate",
    email: "ayu@gojob.demo",
    routes: [
      "/",
      "/candidate",
      "/candidate/search",
      "/candidate/applications",
      "/candidate/invitations",
      "/candidate/matches",
      "/candidate/profile",
      "/candidate/verification",
      "/candidate/edit",
    ],
  },
  {
    name: "employer",
    email: "owner@milkandmadu.demo",
    routes: [
      "/employer",
      "/employer/candidates",
      "/employer/shortlist",
      "/employer/matches",
      "/employer/business",
      "/employer/business/edit",
      "/employer/plans",
      "/employer/jobs/new",
    ],
  },
];

/** Sign in against the Auth emulator and exchange the token for a session cookie. */
async function sessionFor(email) {
  const signIn = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "demo1234", returnSecureToken: true }),
    },
  );
  const { idToken } = await signIn.json();
  if (!idToken) throw new Error(`could not sign in as ${email} — are the emulators seeded?`);

  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const cookie = res.headers.getSetCookie?.().find((c) => c.startsWith("gojob_session="));
  if (!cookie) throw new Error("no session cookie returned by /api/session");
  return cookie.split(";")[0].split("=").slice(1).join("=");
}

const findings = [];
const add = (route, sev, rule, detail) =>
  findings.push({ route, sev, rule, detail });

/** Strip the hidden Suspense payload duplicates so we don't double-count. */
function tagsOf(html, re) {
  return [...html.matchAll(re)].map((m) => m[0]);
}

/**
 * Inline <script> bodies contain React's runtime, whose minified JS trips every
 * markup regex ("<a.length" reads as an anchor tag). Strip them, plus <style>
 * and HTML comments, before any structural check.
 */
function stripNonMarkup(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/** True when the control sits inside a <label>, which names it implicitly. */
function isLabelWrapped(html, index) {
  const before = html.slice(0, index);
  const open = before.lastIndexOf("<label");
  if (open === -1) return false;
  const close = before.lastIndexOf("</label>");
  return open > close;
}

async function fetchRoute(route, session) {
  const res = await fetch(BASE + route, {
    headers: { cookie: `gojob_session=${session}; gojob_lang=en` },
    redirect: "manual",
  });
  const raw = res.status < 400 ? await res.text() : "";
  return { status: res.status, html: stripNonMarkup(raw) };
}

for (const { email, routes } of PERSONAS) {
  const session = await sessionFor(email);
  for (const route of routes) {
  let r;
  try {
    r = await fetchRoute(route, session);
  } catch (e) {
    add(route, "ERROR", "fetch-failed", String(e.message));
    continue;
  }
  if (r.status >= 300) {
    add(route, "INFO", "redirect", `HTTP ${r.status}`);
    continue;
  }
  const html = r.html;

  // --- title -------------------------------------------------------------
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (!title) add(route, "MED", "no-title", "page has no <title>");

  // --- headings ----------------------------------------------------------
  const h1s = tagsOf(html, /<h1[\s>]/g).length;
  if (h1s === 0) add(route, "MED", "no-h1", "no <h1> on the page");
  if (h1s > 1) add(route, "MED", "multiple-h1", `${h1s} <h1> elements`);

  // --- landmarks ---------------------------------------------------------
  const mains = tagsOf(html, /<main[\s>]/g).length;
  if (mains === 0) add(route, "MED", "no-main", "no <main> landmark");
  if (mains > 1) add(route, "HIGH", "multiple-main", `${mains} <main> elements`);

  // --- nested interactive ------------------------------------------------
  if (/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<button\b/.test(html))
    add(route, "HIGH", "button-in-anchor", "a <button> nested inside an <a>");
  if (/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?<a\b[^>]*href/.test(html))
    add(route, "HIGH", "anchor-in-button", "an <a href> nested inside a <button>");

  // --- form controls without an accessible name --------------------------
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const el = m[0];
    if (/type="(hidden|submit|button)"/.test(el)) continue;
    const named =
      /aria-label=/.test(el) ||
      /aria-labelledby=/.test(el) ||
      /\bid="/.test(el) ||
      isLabelWrapped(html, m.index);
    if (!named)
      add(route, "MED", "unlabelled-control", el.slice(0, 90).replace(/\s+/g, " "));
  }

  // --- icon-only buttons with no text and no aria-label ------------------
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attrs = m[1];
    const inner = m[2];
    const text = inner.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, "").trim();
    const hasSr = /class="[^"]*sr-only/.test(inner);
    if (!text && !hasSr && !/aria-label=/.test(attrs))
      add(route, "HIGH", "icon-button-no-name", inner.slice(0, 70).replace(/\s+/g, " "));
  }

  // --- tiny touch targets on interactive elements ------------------------
  for (const m of html.matchAll(/<(?:button|a)\b[^>]*class="([^"]*)"/g)) {
    const cls = m[1];
    // `min-h-7` contains a word boundary before `h-7`, so exclude that prefix.
    // `after:h-11` is the padded-hit-area pattern: compact visual, 44px to touch.
    if (
      /(?<!min-)\bh-(?:4|5|6|7|8)\b/.test(cls) &&
      !/min-h-(?:9|10|11|12)/.test(cls) &&
      !/after:h-11/.test(cls)
    )
      add(route, "LOW", "small-touch-target", cls.slice(0, 80));
  }

  // --- images without alt -------------------------------------------------
  for (const m of html.matchAll(/<img\b([^>]*)>/g))
    if (!/alt=/.test(m[1]))
      add(route, "MED", "img-no-alt", m[1].slice(0, 70));
  }
}

// --- report ---------------------------------------------------------------
const order = { ERROR: 0, HIGH: 1, MED: 2, LOW: 3, INFO: 4 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.route.localeCompare(b.route));

const counts = findings.reduce((acc, f) => ((acc[f.sev] = (acc[f.sev] ?? 0) + 1), acc), {});
console.log("SUMMARY:", JSON.stringify(counts));
console.log("");
const seen = new Set();
for (const f of findings) {
  const key = `${f.route}|${f.rule}|${f.detail}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${f.sev}] ${f.route}  ${f.rule}\n        ${f.detail}`);
}

const blocking = findings.filter((f) => ["ERROR", "HIGH", "MED"].includes(f.sev));
if (blocking.length) {
  console.error(`\n${blocking.length} blocking finding(s) — see above.`);
  process.exit(1);
}
console.log("No blocking findings.");
