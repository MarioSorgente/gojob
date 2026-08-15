import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "demo1234";
export const CANDIDATE = "ayu@gojob.demo";
export const EMPLOYER = "owner@milkandmadu.demo";

/** Sign in through the real form, the way a person does. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  // `waitUntil: "load"` (the default) never resolves here: the app keeps a
  // Firestore realtime connection and an analytics beacon open, so the window
  // `load` event does not fire.
  await page.waitForURL(/\/(candidate|employer)(\/|$)/, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
}

/**
 * Whether a point is actually reachable by a click, or whether something else
 * is painted on top of it. This is how the "cards aren't fully clickable" bug
 * is caught: the element is visible, but `elementFromPoint` returns a sibling
 * that covers it.
 */
export async function hitTarget(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false } as const;
    const r = el.getBoundingClientRect();
    const at = (x: number, y: number) => {
      const hit = document.elementFromPoint(x, y);
      return hit ? { tag: hit.tagName, closestAnchor: !!hit.closest("a") } : null;
    };
    return {
      found: true,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      centre: at(r.left + r.width / 2, r.top + r.height / 2),
      topLeft: at(r.left + 12, r.top + 12),
      bottomRight: at(r.right - 12, r.bottom - 12),
    } as const;
  }, selector);
}

/**
 * Assert an open overlay genuinely behaves like a dialog: it covers the
 * viewport, sits above the page, and is not clipped by an ancestor.
 */
export async function assertIsRealOverlay(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const info = await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!panel) return null;
    const backdrop = panel.parentElement as HTMLElement;
    const b = backdrop.getBoundingClientRect();
    return {
      // The backdrop must span the whole viewport.
      coversViewport:
        Math.round(b.width) >= window.innerWidth &&
        Math.round(b.height) >= window.innerHeight,
      backdropPosition: getComputedStyle(backdrop).position,
      // Portalled to <body> means no transformed ancestor can clip it.
      portalledToBody: backdrop.parentElement === document.body,
      zIndex: getComputedStyle(backdrop).zIndex,
    };
  });

  expect(info, "overlay not found").not.toBeNull();
  expect(info!.backdropPosition).toBe("fixed");
  expect(info!.coversViewport, "backdrop does not cover the viewport").toBe(true);
  expect(info!.portalledToBody, "overlay is not portalled to <body>").toBe(true);
}

/** Count full document loads, to prove navigation stays client-side. */
export function trackNavigations(page: Page) {
  const loads: string[] = [];
  page.on("load", () => loads.push(page.url()));
  return loads;
}
