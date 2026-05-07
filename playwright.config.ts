import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration.
 *
 * Usage:
 *   npx playwright test                  – run all specs headlessly
 *   npx playwright test --ui             – open the interactive UI
 *   npx playwright test --headed         – run in a visible browser
 *
 * Requires both the frontend and backend to be running:
 *   - Frontend: http://localhost:5173  (vite dev server)
 *   - Backend:  http://localhost:3000  (node server)
 *
 * Set FRONTEND_URL and API_URL environment variables to override defaults.
 */

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
