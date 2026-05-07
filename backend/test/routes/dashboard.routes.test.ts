import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, TEST_USER_ID } from "../helpers/test-app.js";

// ---------------------------------------------------------------------------
// Mock service layer
// ---------------------------------------------------------------------------
vi.mock("../../src/services/dashboard.service.js", () => ({
  getDashboardStats: vi.fn(),
}));

import * as dashboardService from "../../src/services/dashboard.service.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SAMPLE_STATS = {
  totalHabits: 3,
  habitsByType: { run: 1, diet: 1, sleep: 1, other: 0 },
  today: { completed: 2, total: 3 },
  month: {
    completedDays: 15,
    totalLogs: 22,
    completedByHabit: [
      { habitId: "h1", habitTitle: "Running Stats", habitType: "run", completedDays: 8, loggedDays: 10 },
      { habitId: "h2", habitTitle: "Sleep Control", habitType: "sleep", completedDays: 7, loggedDays: 10 },
      { habitId: "h3", habitTitle: "Healthy Diet", habitType: "diet", completedDays: 0, loggedDays: 2 },
    ],
  },
  recentLogs: [],
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
// GET /api/dashboard
// ---------------------------------------------------------------------------
describe("GET /api/dashboard", () => {
  it("returns 200 with dashboard statistics for an authenticated user", async () => {
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValueOnce(
      SAMPLE_STATS as Awaited<ReturnType<typeof dashboardService.getDashboardStats>>,
    );

    const response = await app.inject({ method: "GET", url: "/api/dashboard" });

    expect(response.statusCode).toBe(200);
    expect(dashboardService.getDashboardStats).toHaveBeenCalledWith(TEST_USER_ID);

    const body = response.json<typeof SAMPLE_STATS>();
    expect(body.totalHabits).toBe(3);
    expect(body.today.completed).toBe(2);
    expect(body.month.completedDays).toBe(15);
    expect(body.month.completedByHabit).toHaveLength(3);
  });

  it("returns 200 with empty stats when user has no habits", async () => {
    const emptyStats = {
      ...SAMPLE_STATS,
      totalHabits: 0,
      habitsByType: { run: 0, diet: 0, sleep: 0, other: 0 },
      today: { completed: 0, total: 0 },
      month: { completedDays: 0, totalLogs: 0, completedByHabit: [] },
      recentLogs: [],
    };
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValueOnce(
      emptyStats as Awaited<ReturnType<typeof dashboardService.getDashboardStats>>,
    );

    const response = await app.inject({ method: "GET", url: "/api/dashboard" });

    expect(response.statusCode).toBe(200);
    const body = response.json<typeof emptyStats>();
    expect(body.totalHabits).toBe(0);
    expect(body.month.completedByHabit).toHaveLength(0);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const unauthApp = await buildTestApp({ authenticated: false });
    const response = await unauthApp.inject({ method: "GET", url: "/api/dashboard" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: "Unauthorized" });
    await unauthApp.close();
  });
});
