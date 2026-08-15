import { defineConfig, devices } from "@playwright/test";

/**
 * Browser-level tests against the app running on the Firebase emulators.
 *
 * ROADMAP called this out as the outstanding testing gap. It exists now because
 * several design bugs — dead click targets, dialogs clipped by a transformed
 * ancestor, full page reloads on internal navigation — are invisible to unit
 * tests and to reading the HTML. They only show up in a real browser.
 *
 *   npm run emulators   # terminal 1
 *   npm run seed        # once, after the emulators are up
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // One Next server and one Firestore emulator back every worker. Unbounded
  // parallelism starved them and produced 60s timeouts in tests that pass
  // comfortably on their own.
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // Run against a production build by default: `next dev` compiles routes on
  // first request, which makes every first navigation look like a 20s hang.
  timeout: 60_000,
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
