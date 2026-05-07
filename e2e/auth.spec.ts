/**
 * E2E: Authentication flows
 *
 * Tests registration, login, and logout user journeys.
 * These tests require the full application stack to be running.
 */
import { test, expect, uniqueEmail } from "./helpers";

test.describe("Authentication", () => {
  test("new user can register and is redirected to the dashboard", async ({ page }) => {
    const email = uniqueEmail("register");
    const password = "TestPass123!";

    await page.goto("/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);

    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill("New E2E User");
    }

    await page.getByRole("button", { name: /sign up|create account|register/i }).click();

    // Should land on the dashboard after registration
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("registered user can log in with valid credentials", async ({ page }) => {
    const email = uniqueEmail("login");
    const password = "TestPass123!";

    // First register
    await page.goto("/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill("Login E2E User");
    }
    await page.getByRole("button", { name: /sign up|create account|register/i }).click();
    await page.waitForURL("**/dashboard");

    // Log out
    const logoutButton = page.getByRole("button", { name: /log out|sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL("**/login");
    } else {
      await page.goto("/login");
    }

    // Log back in
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("unauthenticated user is redirected to login when accessing protected route", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password shows an error message", async ({ page }) => {
    const email = uniqueEmail("wrongpass");
    const password = "CorrectPassword1!";

    // Register first
    await page.goto("/register");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill("Wrong Pass User");
    }
    await page.getByRole("button", { name: /sign up|create account|register/i }).click();
    await page.waitForURL("**/dashboard");

    // Go to login and try wrong password
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill("WrongPassword!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Should see an error and stay on the login page
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/invalid|incorrect|wrong|error/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });
});
