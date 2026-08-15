import { expect, test } from "@playwright/test";
import { CANDIDATE, EMPLOYER, login } from "./helpers";

/**
 * Chat is the surface a user reported as showing "Something went wrong".
 * These drive it in a real browser and fail on any client-side exception,
 * which is the only way that class of bug surfaces.
 */

/** Fail the test on any uncaught page error or console error. */
function failOnPageErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // Firebase's client SDK logs a permission warning when only the server
    // session exists; the chat falls back to server-rendered messages by design.
    if (/permission|Missing or insufficient/i.test(text)) return;
    if (/Failed to load resource/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

test.describe("candidate chat", () => {
  test("the chats list renders without an error boundary", async ({ page }, testInfo) => {
    const errors = failOnPageErrors(page);
    await login(page, CANDIDATE);
    await page.goto("/candidate/matches");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    await testInfo.attach("chats-list", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("opening a conversation renders the thread", async ({ page }, testInfo) => {
    const errors = failOnPageErrors(page);
    await login(page, CANDIDATE);
    await page.goto("/candidate/matches");

    const firstChat = page.locator('a[href^="/candidate/chat/"]').first();
    test.skip(!(await firstChat.count()), "no seeded conversation");

    await firstChat.click();
    await page.waitForURL(/\/candidate\/chat\//, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("log")).toBeVisible({ timeout: 20_000 });

    // The error boundary renders this; the dictionary payload does not.
    await expect(page.getByRole("heading", { name: /something went wrong/i })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

    await testInfo.attach("chat-thread", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("sending a message appends it to the thread", async ({ page }) => {
    const errors = failOnPageErrors(page);
    await login(page, CANDIDATE);
    await page.goto("/candidate/matches");
    const firstChat = page.locator('a[href^="/candidate/chat/"]').first();
    test.skip(!(await firstChat.count()), "no seeded conversation");
    await firstChat.click();
    await page.waitForURL(/\/candidate\/chat\//, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("log")).toBeVisible({ timeout: 20_000 });

    const body = `e2e ${Date.now()}`;
    await page.getByRole("textbox", { name: "Message" }).fill(body);
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("the back control returns to the chats list", async ({ page }) => {
    await login(page, CANDIDATE);
    await page.goto("/candidate/matches");
    const firstChat = page.locator('a[href^="/candidate/chat/"]').first();
    test.skip(!(await firstChat.count()), "no seeded conversation");
    await firstChat.click();
    await page.waitForURL(/\/candidate\/chat\//, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("log")).toBeVisible({ timeout: 20_000 });

    await page
      .locator('[data-chat-workspace] a[href="/candidate/matches"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/candidate\/matches/);
  });
});

test.describe("employer chat", () => {
  test("renders without an error boundary", async ({ page }, testInfo) => {
    const errors = failOnPageErrors(page);
    await login(page, EMPLOYER);
    await page.goto("/employer/matches");

    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await testInfo.attach("employer-chats", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    const firstChat = page.locator('a[href^="/employer/chat/"]').first();
    if (await firstChat.count()) {
      await firstChat.click();
      await page.waitForURL(/\/employer\/chat\//, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("log")).toBeVisible();
      await testInfo.attach("employer-chat-thread", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
