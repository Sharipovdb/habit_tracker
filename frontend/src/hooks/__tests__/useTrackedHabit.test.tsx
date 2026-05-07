import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTrackedHabit } from "../useTrackedHabit";
import type { Habit, HabitLog, HabitStats } from "../../types";

// ---------------------------------------------------------------------------
// Mock the API functions
// ---------------------------------------------------------------------------
vi.mock("../../api/habits", () => ({
  getHabits: vi.fn(),
  getLogs: vi.fn(),
  getStats: vi.fn(),
  createLog: vi.fn(),
}));

import * as habitsApi from "../../api/habits";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SAMPLE_HABIT: Habit = {
  id: "habit-run-1",
  userId: "user-1",
  title: "Running Stats",
  type: "run",
  target: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const SAMPLE_LOG: HabitLog = {
  id: "log-1",
  habitId: "habit-run-1",
  date: "2024-05-01",
  data: { distance: 5, pace: 6, duration: 30, caloriesBurned: 363 },
};

const SAMPLE_STATS: HabitStats = {
  currentStreak: 3,
  bestStreak: 5,
  totalCompletedDays: 10,
};

// ---------------------------------------------------------------------------
// Helper: creates a fresh QueryClient for each test
// ---------------------------------------------------------------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useTrackedHabit", () => {
  describe("habit resolution", () => {
    it("finds the habit by type from the habits list", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([SAMPLE_HABIT]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([SAMPLE_LOG]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.habit).not.toBeNull());

      expect(result.current.habit).toEqual(SAMPLE_HABIT);
      expect(result.current.habitId).toBe("habit-run-1");
    });

    it("returns null habit when no habit matches the requested type", async () => {
      // Only a "diet" habit exists; requesting "sleep"
      vi.mocked(habitsApi.getHabits).mockResolvedValue([
        { ...SAMPLE_HABIT, type: "diet" as const },
      ]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "sleep", cacheScope: "sleep" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.habitsQuery.isSuccess).toBe(true));

      expect(result.current.habit).toBeNull();
      expect(result.current.habitId).toBeUndefined();
    });

    it("returns null habit when habits list is empty", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.habitsQuery.isSuccess).toBe(true));

      expect(result.current.habit).toBeNull();
    });
  });

  describe("logs query", () => {
    it("loads logs when the habit is found", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([SAMPLE_HABIT]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([SAMPLE_LOG]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.logs).toHaveLength(1));

      expect(result.current.logs[0]).toEqual(SAMPLE_LOG);
      expect(habitsApi.getLogs).toHaveBeenCalledWith("habit-run-1");
    });

    it("returns an empty logs array when no habit is found", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.habitsQuery.isSuccess).toBe(true));

      expect(result.current.logs).toEqual([]);
      expect(habitsApi.getLogs).not.toHaveBeenCalled();
    });
  });

  describe("stats query", () => {
    it("does not load stats when includeStats is false (default)", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([SAMPLE_HABIT]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.logsQuery.isSuccess).toBe(true));

      expect(habitsApi.getStats).not.toHaveBeenCalled();
      expect(result.current.stats).toBeNull();
    });

    it("loads stats when includeStats is true", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([SAMPLE_HABIT]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([SAMPLE_LOG]);
      vi.mocked(habitsApi.getStats).mockResolvedValue(SAMPLE_STATS);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run", includeStats: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.stats).not.toBeNull());

      expect(result.current.stats).toEqual(SAMPLE_STATS);
      expect(habitsApi.getStats).toHaveBeenCalledWith("habit-run-1");
    });
  });

  describe("isLoading aggregation", () => {
    it("isLoading is true while habits are loading", () => {
      // getHabits never resolves so the query stays in loading state
      vi.mocked(habitsApi.getHabits).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("isLoading is false after both habits and logs have loaded", async () => {
      vi.mocked(habitsApi.getHabits).mockResolvedValue([SAMPLE_HABIT]);
      vi.mocked(habitsApi.getLogs).mockResolvedValue([]);

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe("hasError aggregation", () => {
    it("hasError is true when the habits query fails", async () => {
      vi.mocked(habitsApi.getHabits).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(
        () => useTrackedHabit({ habitType: "run", cacheScope: "run" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.habitsQuery.isError).toBe(true));

      expect(result.current.hasError).toBe(true);
    });
  });
});
