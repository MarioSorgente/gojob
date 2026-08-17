import { expect, test } from "@playwright/test";
import { EMPLOYER, login } from "./helpers";

/**
 * The desktop filter rail used to navigate on every change, so typing a salary
 * fired one server round-trip per digit and the panel dimmed while you were
 * still entering the number. Edits are now staged behind an Apply button.
 */

test.use({ viewport: { width: 1440, height: 900 } });

test.describe("desktop filter rail", () => {
  test("editing filters does not navigate until Apply is pressed", async ({
    page,
  }, testInfo) => {
    await login(page, EMPLOYER);
    await page.goto("/employer/candidates");

    const rail = page.getByRole("complementary", { name: /filters/i });
    await expect(rail).toBeVisible();

    const urlBefore = page.url();
    const navigations: string[] = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) navigations.push(f.url());
    });

    // Touch several controls, including one that is typed character by
    // character — the case that made the old rail unusable.
    await rail.getByLabel(/minimum years of experience/i).fill("3");
    await rail.getByLabel(/maximum monthly salary/i).fill("8000000");
    await rail.locator("select").first().selectOption({ index: 1 });

    await page.waitForTimeout(750);
    expect(navigations, `navigated while editing: ${navigations.join(", ")}`).toEqual(
      [],
    );
    expect(page.url()).toBe(urlBefore);

    await testInfo.attach("rail-staged", {
      body: await rail.screenshot(),
      contentType: "image/png",
    });

    // Apply commits everything in one navigation.
    await rail.getByRole("button", { name: /apply/i }).click();
    await page.waitForURL(/minExp=3/, { waitUntil: "domcontentloaded" });

    const url = new URL(page.url());
    expect(url.searchParams.get("minExp")).toBe("3");
    expect(url.searchParams.get("maxSalary")).toBe("8000000");
    expect(navigations.length, "Apply should be a single navigation").toBeLessThanOrEqual(2);
  });

  test("Apply is disabled until something changes", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.goto("/employer/candidates");

    const rail = page.getByRole("complementary", { name: /filters/i });
    const apply = rail.getByRole("button", { name: /apply/i });
    await expect(apply).toBeDisabled();

    await rail.getByLabel(/minimum years of experience/i).fill("4");
    await expect(apply).toBeEnabled();
    // It reports how much is waiting, so the button is not a mystery.
    await expect(apply).toHaveText(/1/);
  });

  test("the rail resets when filters are cleared from the URL", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.goto("/employer/candidates?minExp=5");

    const rail = page.getByRole("complementary", { name: /filters/i });
    await expect(rail.getByLabel(/minimum years of experience/i)).toHaveValue("5");

    await page.goto("/employer/candidates");
    await expect(rail.getByLabel(/minimum years of experience/i)).toHaveValue("");
  });

  test("language level and ID verification are distinct, correctly named filters", async ({
    page,
  }) => {
    await login(page, EMPLOYER);
    await page.goto("/employer/candidates");
    const rail = page.getByRole("complementary", { name: /filters/i });

    // Both were labelled around "verification", so the rail showed two
    // verification-looking controls, one of which filtered language level.
    await expect(rail.getByLabel(/minimum language level/i)).toBeVisible();
    await expect(rail.getByLabel(/id-verified candidates only/i)).toBeVisible();
    await expect(rail.getByLabel(/^verification$/i)).toHaveCount(0);
  });
});
