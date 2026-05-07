import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, TEST_USER_ID } from "../helpers/test-app.js";

// ---------------------------------------------------------------------------
// Mock service layer
// ---------------------------------------------------------------------------
vi.mock("../../src/services/habit.service.js", () => ({
  createHabit: vi.fn(),
  getHabitsByUser: vi.fn(),
  deleteHabit: vi.fn(),
  getHabitById: vi.fn(),
  ensureDefaultHabits: vi.fn(),
}));

vi.mock("../../src/services/log.service.js", () => ({
  computeLogData: vi.fn(),
  createLog: vi.fn(),
  getLogsByHabit: vi.fn(),
  getHabitStats: vi.fn(),
  isCompleted: vi.fn(),
}));

import * as habitService from "../../src/services/habit.service.js";
import * as logService from "../../src/services/log.service.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const HABIT_ID = "habit-uuid-1";

const SAMPLE_HABIT = {
  id: HABIT_ID,
  userId: TEST_USER_ID,
  title: "Running Stats",
  type: "run",
  target: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

const SAMPLE_LOG = {
  id: "log-uuid-1",
  habitId: HABIT_ID,
  date: "2024-05-07",
  data: { distance: 5, pace: 6, duration: 30, caloriesBurned: 363 },
};

const SAMPLE_STATS = {
  currentStreak: 3,
  bestStreak: 5,
  totalCompletedDays: 10,
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
// POST /api/habits/:id/log
// ---------------------------------------------------------------------------
describe("POST /api/habits/:id/log", () => {
  it("returns 201 with the created log", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(SAMPLE_HABIT);
    vi.mocked(logService.computeLogData).mockReturnValueOnce(
      SAMPLE_LOG.data as ReturnType<typeof logService.computeLogData>,
    );
    vi.mocked(logService.createLog).mockResolvedValueOnce({
      updated: false,
      log: SAMPLE_LOG,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/habits/${HABIT_ID}/log`,
      payload: { distance: 5, date: "2024-05-07" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<typeof SAMPLE_LOG>();
    expect(body.habitId).toBe(HABIT_ID);
    expect(body.date).toBe("2024-05-07");
  });

  it("uses today's date when date is not provided in the body", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(SAMPLE_HABIT);
    vi.mocked(logService.computeLogData).mockReturnValueOnce(
      SAMPLE_LOG.data as ReturnType<typeof logService.computeLogData>,
    );
    vi.mocked(logService.createLog).mockResolvedValueOnce({
      updated: false,
      log: SAMPLE_LOG,
    });

    await app.inject({
      method: "POST",
      url: `/api/habits/${HABIT_ID}/log`,
      payload: { distance: 5 },
    });

    const callArgs = vi.mocked(logService.createLog).mock.calls[0];
    const usedDate = callArgs[1];
    // Should be a YYYY-MM-DD string
    expect(usedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 404 when the habit is not found or belongs to another user", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(null as never);

    const response = await app.inject({
      method: "POST",
      url: `/api/habits/${HABIT_ID}/log`,
      payload: { distance: 5 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "Habit not found" });
    expect(logService.createLog).not.toHaveBeenCalled();
  });

  it("returns 201 with updated: true on upsert", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(SAMPLE_HABIT);
    vi.mocked(logService.computeLogData).mockReturnValueOnce(
      SAMPLE_LOG.data as ReturnType<typeof logService.computeLogData>,
    );
    vi.mocked(logService.createLog).mockResolvedValueOnce({
      updated: true,
      log: { ...SAMPLE_LOG, data: { distance: 8, pace: 6, duration: 48, caloriesBurned: 580 } },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/habits/${HABIT_ID}/log`,
      payload: { distance: 8, date: "2024-05-07" },
    });

    expect(response.statusCode).toBe(201);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "POST",
      url: `/api/habits/${HABIT_ID}/log`,
      payload: { distance: 5 },
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});

// ---------------------------------------------------------------------------
// GET /api/habits/:id/logs
// ---------------------------------------------------------------------------
describe("GET /api/habits/:id/logs", () => {
  it("returns 200 with an array of logs", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(SAMPLE_HABIT);
    vi.mocked(logService.getLogsByHabit).mockResolvedValueOnce([SAMPLE_LOG]);

    const response = await app.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/logs`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<typeof SAMPLE_LOG[]>();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("log-uuid-1");
  });

  it("returns 404 when the habit is not found", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(null as never);

    const response = await app.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/logs`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/logs`,
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});

// ---------------------------------------------------------------------------
// GET /api/habits/:id/stats
// ---------------------------------------------------------------------------
describe("GET /api/habits/:id/stats", () => {
  it("returns 200 with habit statistics", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(SAMPLE_HABIT);
    vi.mocked(logService.getHabitStats).mockResolvedValueOnce(SAMPLE_STATS);

    const response = await app.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/stats`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<typeof SAMPLE_STATS>();
    expect(body.currentStreak).toBe(3);
    expect(body.bestStreak).toBe(5);
    expect(body.totalCompletedDays).toBe(10);
  });

  it("returns 404 when the habit is not found", async () => {
    vi.mocked(habitService.getHabitById).mockResolvedValueOnce(null as never);

    const response = await app.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/stats`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({
      method: "GET",
      url: `/api/habits/${HABIT_ID}/stats`,
    });

    expect(response.statusCode).toBe(401);
    await unauthApp.close();
  });
});
