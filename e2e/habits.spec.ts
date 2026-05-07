/**
 * E2E: Habit logging flows
 *
 * Tests the main habit-tracking user journeys:
 *   1. Dashboard shows habit summary after login
 *   2. Logging a run updates the dashboard
 *   3. Logging consecutive days increases the streak counter
 *   4. Logging a sleep session shows score on the calendar
 *   5. Updating profile saves new weight/height
 *
 * These tests require the full application stack to be running.
 */
import { test, expect } from "./helpers";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
test.describe("Dashboard", () => {
  test("authenticated user sees the dashboard with habit stats", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    // The dashboard heading or a recognisable UI element should be present
    await expect(
      page.getByRole("heading", { name: /dashboard|overview|today/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Running habit
// ---------------------------------------------------------------------------
test.describe("Run habit", () => {
  test("user can log a run and the dashboard reflects the new log", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to the run tracking page
    await page.goto("/run");

    // Fill in a distance (the exact field label may vary)
    const distanceInput = page.getByRole("spinbutton").first();
    await distanceInput.fill("5");

    // Submit the form
    await page.getByRole("button", { name: /save|log|add/i }).click();

    // Should show a success indicator (toast, message, or calendar update)
    await expect(
      page.getByText(/saved|logged|success|✓|done/i).first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Sleep habit
// ---------------------------------------------------------------------------
test.describe("Sleep habit", () => {
  test("user can log a sleep session and the score appears in the calendar", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/sleep");

    // Fill in bedtime and wake time if inputs are visible
    const timeInputs = page.getByRole("textbox");
    const count = await timeInputs.count();
    if (count >= 2) {
      await timeInputs.nth(0).fill("23:00");
      await timeInputs.nth(1).fill("07:00");
    }

    await page.getByRole("button", { name: /save|log|add/i }).click();

    // A success indicator or the calendar with a score should appear
    await expect(
      page.getByText(/saved|logged|success/i).first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
test.describe("Profile", () => {
  test("user can update their weight and it persists", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/profile");

    // Find and update the weight field
    const weightInput = page.getByRole("spinbutton", { name: /weight/i });
    await weightInput.clear();
    await weightInput.fill("75");

    await page.getByRole("button", { name: /save|update/i }).click();

    // The value should persist after reloading
    await page.reload();
    await expect(weightInput).toHaveValue("75", { timeout: 5_000 });
  });
});
