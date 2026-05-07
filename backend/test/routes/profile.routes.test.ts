import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, TEST_USER_ID } from "../helpers/test-app.js";

// ---------------------------------------------------------------------------
// Mock service layer
// ---------------------------------------------------------------------------
vi.mock("../../src/services/profile.service.js", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  setProfileImage: vi.fn(),
}));

vi.mock("../../src/services/reminder-mailer.js", () => ({
  createReminderMailer: vi.fn(() => null),
}));

import * as profileService from "../../src/services/profile.service.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SAMPLE_PROFILE = {
  id: TEST_USER_ID,
  email: "test@example.com",
  name: "Test User",
  notificationEmail: null as string | null,
  reminderEnabled: false,
  timezone: "UTC",
  image: null as string | null,
  age: null as number | null,
  height: null as number | null,
  weight: null as number | null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
let app: FastifyInstance;

beforeEach(async () => {
  vi.resetAllMocks();
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// GET /api/profile
// ---------------------------------------------------------------------------
describe("GET /api/profile", () => {
  it("returns 200 with the user profile", async () => {
    vi.mocked(profileService.getProfile).mockResolvedValueOnce(SAMPLE_PROFILE);

    const response = await app.inject({ method: "GET", url: "/api/profile" });

    expect(response.statusCode).toBe(200);
    const body = response.json<Record<string, unknown>>();
    expect(body.id).toBe(TEST_USER_ID);
    expect(body.email).toBe("test@example.com");
    expect(body.reminderEnabled).toBe(false);
    expect(profileService.getProfile).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("returns 404 when the user is not found", async () => {
    vi.mocked(profileService.getProfile).mockResolvedValueOnce(null as never);

    const response = await app.inject({ method: "GET", url: "/api/profile" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "User not found" });
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({ method: "GET", url: "/api/profile" });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/profile
// ---------------------------------------------------------------------------
describe("PUT /api/profile", () => {
  it("returns 200 with the updated profile", async () => {
    const updated = { ...SAMPLE_PROFILE, name: "Updated Name", weight: 75 };
    vi.mocked(profileService.updateProfile).mockResolvedValueOnce(updated);

    const response = await app.inject({
      method: "PUT",
      url: "/api/profile",
      payload: { name: "Updated Name", weight: 75 },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Record<string, unknown>>();
    expect(body.name).toBe("Updated Name");
    expect(body.weight).toBe(75);
    expect(profileService.updateProfile).toHaveBeenCalledWith(TEST_USER_ID, {
      name: "Updated Name",
      weight: 75,
    });
  });

  it("returns 200 when updating reminder settings", async () => {
    const updated = {
      ...SAMPLE_PROFILE,
      reminderEnabled: true,
      notificationEmail: "notify@example.com",
    };
    vi.mocked(profileService.updateProfile).mockResolvedValueOnce(updated);

    const response = await app.inject({
      method: "PUT",
      url: "/api/profile",
      payload: { reminderEnabled: true, notificationEmail: "notify@example.com" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Record<string, unknown>>();
    expect(body.reminderEnabled).toBe(true);
    expect(body.notificationEmail).toBe("notify@example.com");
  });

  it("returns 404 when the user is not found", async () => {
    vi.mocked(profileService.updateProfile).mockResolvedValueOnce(null as never);

    const response = await app.inject({
      method: "PUT",
      url: "/api/profile",
      payload: { name: "Ghost User" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "PUT",
      url: "/api/profile",
      payload: { name: "Name" },
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});
