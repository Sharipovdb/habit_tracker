import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, TEST_USER_ID } from "../helpers/test-app.js";

// ---------------------------------------------------------------------------
// Mock the habit service so no DB connection is created
// ---------------------------------------------------------------------------
vi.mock("../../src/services/habit.service.js", () => ({
  createHabit: vi.fn(),
  getHabitsByUser: vi.fn(),
  deleteHabit: vi.fn(),
  getHabitById: vi.fn(),
  ensureDefaultHabits: vi.fn(),
}));

import * as habitService from "../../src/services/habit.service.js";

const SAMPLE_HABIT = {
  id: "00000000-0000-0000-0000-000000000002",
  userId: TEST_USER_ID,
  title: "Running Stats",
  type: "run",
  target: null,
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
// GET /api/habits
// ---------------------------------------------------------------------------
describe("GET /api/habits", () => {
  it("returns 200 with an array of habits for an authenticated user", async () => {
    vi.mocked(habitService.getHabitsByUser).mockResolvedValueOnce([SAMPLE_HABIT]);

    const response = await app.inject({ method: "GET", url: "/api/habits" });

    expect(response.statusCode).toBe(200);
    const body = response.json<typeof SAMPLE_HABIT[]>();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(SAMPLE_HABIT.id);
    expect(body[0].type).toBe("run");
    expect(habitService.getHabitsByUser).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("returns 200 with an empty array when user has no habits", async () => {
    vi.mocked(habitService.getHabitsByUser).mockResolvedValueOnce([]);

    const response = await app.inject({ method: "GET", url: "/api/habits" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({ method: "GET", url: "/api/habits" });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});

// ---------------------------------------------------------------------------
// POST /api/habits
// ---------------------------------------------------------------------------
describe("POST /api/habits", () => {
  it("returns 201 with the created habit", async () => {
    vi.mocked(habitService.createHabit).mockResolvedValueOnce(SAMPLE_HABIT);

    const response = await app.inject({
      method: "POST",
      url: "/api/habits",
      payload: { title: "Running Stats", type: "run" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<typeof SAMPLE_HABIT>();
    expect(body.title).toBe("Running Stats");
    expect(body.type).toBe("run");
    expect(habitService.createHabit).toHaveBeenCalledWith(
      TEST_USER_ID,
      "Running Stats",
      "run",
      undefined,
    );
  });

  it("returns 201 with an optional target", async () => {
    const habitWithTarget = { ...SAMPLE_HABIT, target: "5km daily" };
    vi.mocked(habitService.createHabit).mockResolvedValueOnce(habitWithTarget);

    const response = await app.inject({
      method: "POST",
      url: "/api/habits",
      payload: { title: "Running Stats", type: "run", target: "5km daily" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<typeof SAMPLE_HABIT>().target).toBe("5km daily");
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/habits",
      payload: { title: "No type" }, // missing "type"
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "POST",
      url: "/api/habits",
      payload: { title: "Running Stats", type: "run" },
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/habits/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/habits/:id", () => {
  it("returns 200 when the habit exists and belongs to the user", async () => {
    vi.mocked(habitService.deleteHabit).mockResolvedValueOnce(SAMPLE_HABIT);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/habits/${SAMPLE_HABIT.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Habit deleted" });
    expect(habitService.deleteHabit).toHaveBeenCalledWith(SAMPLE_HABIT.id, TEST_USER_ID);
  });

  it("returns 404 when the habit is not found or belongs to another user", async () => {
    vi.mocked(habitService.deleteHabit).mockResolvedValueOnce(null as never);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/habits/${SAMPLE_HABIT.id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "Habit not found" });
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "DELETE",
      url: `/api/habits/${SAMPLE_HABIT.id}`,
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});
