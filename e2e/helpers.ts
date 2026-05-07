/**
 * Shared helpers and fixtures for E2E tests.
 *
 * Provides typed utilities for:
 * - Registering / logging in test users
 * - Creating habits via the API
 * - Generating unique email addresses per test run
 */
import { test as base, expect, type Page } from "@playwright/test";

export { expect };

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

// ---------------------------------------------------------------------------
// Utility: unique test email
// ---------------------------------------------------------------------------
let _counter = 0;
export function uniqueEmail(prefix = "user"): string {
  _counter += 1;
  return `${prefix}-${Date.now()}-${_counter}@e2e.test`;
}

/**
 * API helper: register a new user through the backend via Playwright's request context.
 * @param request - Playwright `APIRequestContext` (from `test.request`)
 */
export async function apiRegister(
  request: { post: (url: string, opts: { data: object }) => Promise<{ status: () => number }> },
  email: string,
  password: string,
): Promise<void> {
  const resp = await request.post(`${API_URL}/auth/sign-up/email`, {
    data: { email, password, name: "E2E Test User" },
  });
  const status = resp.status();
  // Accept 200/201 (new user) or 422 (already exists in repeated runs)
  if (status !== 200 && status !== 201 && status !== 422) {
    throw new Error(`Registration failed with status ${status}`);
  }
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/** Navigate to the login page and sign in with the given credentials. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait for the authenticated state (redirect to dashboard)
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

/** Register a new user via the UI sign-up form. */
export async function signUpViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  const nameInput = page.getByLabel(/name/i);
  if (await nameInput.isVisible()) {
    await nameInput.fill("E2E Test User");
  }
  await page.getByRole("button", { name: /sign up|create account|register/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Extended test fixture: authenticated page
// ---------------------------------------------------------------------------
interface AuthenticatedFixtures {
  authenticatedPage: Page;
  testEmail: string;
  testPassword: string;
}

export const test = base.extend<AuthenticatedFixtures>({
  testEmail: async ({}, use) => {
    await use(uniqueEmail("e2e"));
  },

  testPassword: async ({}, use) => {
    await use("E2ePassword123!");
  },

  authenticatedPage: async ({ page, testEmail, testPassword }, use) => {
    await signUpViaUI(page, testEmail, testPassword);
    await use(page);
  },
});
