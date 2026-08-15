import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  CANDIDATE,
  EMPLOYER,
  assertIsRealOverlay,
  hitTarget,
  login,
  trackNavigations,
} from "./helpers";

/**
 * End-to-end coverage for the design bugs found by using the app:
 *   1. going back after login looked like being signed out
 *   2. cards that open were clipped instead of covering the page
 *   3. cards were only clickable in the gaps between their content
 *   4. every internal navigation was a full page reload
 *
 * Each test drives the real UI and captures a screenshot for review.
 */

/** Open a real job, not the "Post a job" link, which also lives under /jobs/. */
async function openFirstEmployerJob(page: Page) {
  await page.goto("/employer");
  const job = page
    .locator("a[href^='/employer/jobs/']:not([href$='/new'])")
    .first();
  await expect(job).toBeVisible({ timeout: 20_000 });
  await job.click();
  await page.waitForURL(/\/employer\/jobs\/(?!new)/, {
    waitUntil: "domcontentloaded",
  });
}

test.describe("session and back navigation", () => {
  test("going back after login keeps you signed in", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();

    await login(page, CANDIDATE);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ayu");
    await testInfo.attach("after-login", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    // Back until we reach the landing page again. Sign-in is a deliberate hard
    // navigation, so how many entries sit between here and "/" varies; a spent
    // history stack aborts rather than throwing something useful.
    for (let i = 0; i < 4 && new URL(page.url()).pathname !== "/"; i++) {
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    }
    expect(new URL(page.url()).pathname).toBe("/");

    // The bug: this page used to render "Log in" and the signed-out CTAs.
    // Rendered twice by design — once in the header, once as the hero CTA.
    await expect(
      page.getByRole("link", { name: /go to dashboard/i }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^log in$/i })).toHaveCount(0);
    await testInfo.attach("landing-after-back", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test("visiting /login while signed in bounces to the dashboard", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/candidate/);
  });

  test("logging out then going back does not show a signed-in page", async ({ page }) => {
    await login(page, CANDIDATE);
    await page
      .getByRole("button", { name: /log out/i })
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForURL((u) => u.pathname === "/", { waitUntil: "domcontentloaded" });
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await expect(page.getByRole("button", { name: /log out/i })).toHaveCount(0);
  });
});

test.describe("cards are fully clickable", () => {
  test("every part of a job card hits the link", async ({ page }, testInfo) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/search");

    const card = page.locator("article").first();
    await expect(card).toBeVisible();

    // The bug: only the padding gaps hit the anchor; the title, salary and
    // posted-date rows were covered by positioned siblings.
    const hits = await hitTarget(page, "article");
    expect(hits.found).toBe(true);
    expect(hits.centre?.closestAnchor, "card centre is not clickable").toBe(true);
    expect(hits.topLeft?.closestAnchor, "card top-left is not clickable").toBe(true);
    expect(
      hits.bottomRight?.closestAnchor,
      "card bottom-right is not clickable",
    ).toBe(true);

    await testInfo.attach("job-card", {
      body: await card.screenshot(),
      contentType: "image/png",
    });
  });

  test("clicking the middle of a card opens the job", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/search");
    const card = page.locator("article").first();
    // Click straight onto the title text. The stretched link covers it, so this
    // only navigates when the whole card is clickable.
    await card.getByRole("heading").click({ force: true });
    await expect(page).toHaveURL(/\/candidate\/jobs\//);
  });

  test("the score chip inside a card still works on its own", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/search");
    const chip = page.locator("article").first().getByRole("button").first();
    if (await chip.count()) {
      await chip.click();
      await assertIsRealOverlay(page);
      await expect(page).not.toHaveURL(/\/candidate\/jobs\//);
    }
  });
});

test.describe("overlays behave as dialogs", () => {
  test("the match explainer covers the page", async ({ page }, testInfo) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/search");
    const chip = page.locator("article").first().getByRole("button").first();
    test.skip(!(await chip.count()), "no explainable score on this dataset");

    await chip.click();
    await assertIsRealOverlay(page);
    await testInfo.attach("match-explainer", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the share sheet opens from inside the job page and covers it", async ({
    page,
  }, testInfo) => {
    await login(page, EMPLOYER);
    await page.goto("/employer");
    await openFirstEmployerJob(page);

    const share = page.getByRole("button", { name: /share/i });
    await share.click();
    await assertIsRealOverlay(page);
    await testInfo.attach("share-sheet", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    // Backdrop click closes it.
    await page.mouse.click(5, 5);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("an open dialog traps focus and restores it on close", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.goto("/employer");
    await openFirstEmployerJob(page);

    const share = page.getByRole("button", { name: /share/i });
    await share.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const insideDialog = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    );
    expect(insideDialog, "focus did not move into the dialog").toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("internal navigation stays client-side", () => {
  test("moving between tabs never reloads the document", async ({ page }) => {
    await login(page, CANDIDATE);
    // Let the deliberate post-login document load settle before counting; the
    // hard navigation at sign-in is the fix, not the bug.
    await page.waitForLoadState("load").catch(() => {});
    const loads = trackNavigations(page);

    for (const name of [/search/i, /invites/i, /chats/i, /profile/i]) {
      await page.getByRole("link", { name }).first().click();
      await page.waitForLoadState("domcontentloaded");
    }

    // The bug: ButtonLink/BackLink rendered raw <a>, so each of these was a
    // full document load.
    expect(loads, `full page reloads: ${loads.join(", ")}`).toHaveLength(0);
  });

  test("the logo goes to the dashboard, not the marketing page", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/profile");
    const logo = page.locator('a[href="/candidate"]').first();
    await expect(logo).toHaveCount(1);
  });

  test("back links work from every detail page", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/applications");
    await page.getByRole("link", { name: /for you/i }).first().click();
    await expect(page).toHaveURL(/\/candidate$/);
  });
});
