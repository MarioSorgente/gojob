import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the dependency shape that firebase-admin needs in order to load on
 * Vercel. This is a regression test for a production outage, not hygiene.
 *
 * Background: firebase-admin -> jwks-rsa -> jose. jose v6 is ESM-only — its
 * exports map has no `require` condition at all. Node 22.12+/24 can normally
 * `require()` such a module, so this loads fine locally and in `next start`.
 * Vercel's Node runtime patches `Module._load`, and that patched loader does
 * not honour native require(esm), so every server route touching Firebase died
 * with ERR_REQUIRE_ESM — login, both dashboards, admin, all of it.
 *
 * The fix is the `jose: ^5.10.0` override in package.json: v5 ships a real CJS
 * build. Removing that override, or a transitive bump that reintroduces an
 * ESM-only jose, must fail here rather than in production.
 */

/** Node flag that turns off require(esm), reproducing Vercel's loader. */
const CJS_ONLY = "--no-experimental-require-module";

/** The entry points src/lib/firebase/admin.ts imports. */
const ENTRY_POINTS = [
  "firebase-admin/app",
  "firebase-admin/auth",
  "firebase-admin/firestore",
];

/**
 * All three are checked in a single subprocess. Spawning Node three times cost
 * ~30s under parallel test workers, and one process proves exactly as much.
 */
function requiresCleanlyWithoutEsmSupport(): { ok: boolean; output: string } {
  const script = ENTRY_POINTS.map((s) => `require(${JSON.stringify(s)});`).join("");
  try {
    execFileSync(process.execPath, [CJS_ONLY, "-e", script], {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf8",
      timeout: 60_000,
    });
    return { ok: true, output: "" };
  } catch (error) {
    const e = error as { stderr?: string; message?: string };
    return { ok: false, output: e.stderr || e.message || "" };
  }
}

describe("firebase-admin loads under a CJS-only loader", () => {
  it(
    "can require every firebase-admin entry point without native require(esm)",
    { timeout: 90_000 },
    () => {
      const result = requiresCleanlyWithoutEsmSupport();
      expect(
        result.ok,
        "firebase-admin failed to load without require(esm) support — this is " +
          `exactly how it fails on Vercel:\n${result.output}`,
      ).toBe(true);
    },
  );

  it("resolves a jose build that exposes a CJS entry point", () => {
    // The underlying invariant, asserted directly so a failure names the cause
    // rather than only the symptom.
    const fromJwks = createRequire(
      path.join(path.dirname(require.resolve("jwks-rsa/package.json")), "index.js"),
    );
    const pkg = fromJwks("jose/package.json") as {
      version: string;
      exports?: Record<string, { require?: string }>;
    };

    expect(
      pkg.exports?.["."]?.require,
      `jose@${pkg.version} has no "require" export condition, so a CJS-only ` +
        `loader cannot load it. Check the jose override in package.json.`,
    ).toBeTruthy();
  });
});
