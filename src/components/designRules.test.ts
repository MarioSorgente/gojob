import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Design regression guards.
 *
 * These encode bugs that were found by actually using the app and that a type
 * checker cannot catch: dead click targets, dialogs that render inline, and
 * navigation that reloads the whole page. Each one shipped at least once.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((path) => ({
  path: path.replace(SRC, "src").replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

const find = (name: string) => {
  const file = FILES.find((f) => f.path.endsWith(name));
  if (!file) throw new Error(`fixture missing: ${name}`);
  return file.text;
};

describe("stretched-link cards stay fully clickable", () => {
  /**
   * The overlay anchor must not carry a z-index and the content around it must
   * stay unpositioned. Positioned siblings paint over a `z-0` anchor, which left
   * only the padding gaps clickable — the title, salary and posted date were dead.
   */
  it("gives the overlay anchor no z-index", () => {
    for (const { path, text } of FILES) {
      const offenders = [...text.matchAll(/className="[^"]*absolute inset-0[^"]*"/g)]
        .map((m) => m[0])
        .filter((cls) => /\bz-\d/.test(cls));
      expect(offenders, `${path} puts a z-index on a stretched link`).toEqual([]);
    }
  });

  it("keeps JobCard content unpositioned so the anchor stays on top", () => {
    const text = find("cards/JobCard.tsx");
    // Only two `relative` are legitimate: the card root, and the score explainer
    // which deliberately sits back above the anchor.
    const positioned = [...text.matchAll(/className=[{"`][^"`}]*\brelative\b[^"`}]*/g)];
    expect(positioned.length).toBeLessThanOrEqual(2);
    expect(text).toContain("relative z-10");
  });
});

describe("overlays behave as dialogs", () => {
  it("renders the Sheet through a portal", () => {
    const text = find("components/Sheet.tsx");
    // Inline rendering breaks position:fixed under any transformed ancestor —
    // the swipe deck drags cards with translateX, the chat shell clips overflow.
    expect(text).toContain("createPortal");
    expect(text).toContain("document.body");
  });

  it("routes every overlay through Sheet rather than a hand-rolled backdrop", () => {
    for (const { path, text } of FILES) {
      if (path.endsWith("components/Sheet.tsx")) continue;
      const handRolled = /className="[^"]*fixed inset-0[^"]*bg-black\//.test(text);
      expect(handRolled, `${path} hand-rolls a modal backdrop`).toBe(false);
    }
  });
});

describe("internal navigation stays client-side", () => {
  it("builds link primitives on next/link, not raw anchors", () => {
    const text = find("components/ui.tsx");
    expect(text).toContain('import Link from "next/link"');
    // A raw <a> here means every ButtonLink/TextLink/BackLink in the app
    // triggers a full document reload.
    expect(text).not.toMatch(/<a\s*$/m);
    expect(text).not.toMatch(/<a\s+className/);
  });

  it("only uses raw anchors for external destinations", () => {
    for (const { path, text } of FILES) {
      for (const m of text.matchAll(/<a\s+[^>]*href=\{?["'`]([^"'`}]+)/g)) {
        const href = m[1];
        if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
        if (href.startsWith("#")) continue; // same-page anchor
        expect.fail(`${path} navigates internally with a raw <a href="${href}">`);
      }
    }
  });
});

describe("touch targets", () => {
  it("has no interactive control shorter than the 44px guideline", () => {
    for (const { path, text } of FILES) {
      // h-7/h-8 are fine on decorative spans; flag them only on real controls
      // that do not compensate with min-h or a padded pseudo-element.
      const bad = [...text.matchAll(/<(?:button|Button)\b[^>]*className="([^"]*)"/g)]
        .map((m) => m[1])
        .filter((cls) => /\bh-[1-8]\b/.test(cls) && !/min-h-(?:9|10|11|12)|after:h-11/.test(cls));
      expect(bad, `${path} has an undersized control`).toEqual([]);
    }
  });
});
