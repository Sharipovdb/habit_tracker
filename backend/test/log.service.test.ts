import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeLogData,
  isCompleted,
  getHabitStats,
} from "../src/services/log.service.ts";

// ---------------------------------------------------------------------------
// Mock the database so no Postgres connection is attempted
// ---------------------------------------------------------------------------
const { mockOrderBy, mockDbChain } = vi.hoisted(() => {
  const orderBy = vi.fn().mockResolvedValue([]);
  const chain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy,
  };
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return { mockOrderBy: orderBy, mockDbChain: chain };
});

vi.mock("../src/db/index.js", () => ({ db: mockDbChain }));

beforeEach(() => {
  vi.clearAllMocks();
  mockDbChain.select.mockReturnValue(mockDbChain);
  mockDbChain.from.mockReturnValue(mockDbChain);
  mockDbChain.where.mockReturnValue(mockDbChain);
  mockOrderBy.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// computeLogData – "run"
// ---------------------------------------------------------------------------
describe('computeLogData("run", ...)', () => {
  it("calculates duration and calories with explicit pace and weight", () => {
    const result = computeLogData("run", { distance: 10, pace: 5, weight: 80 });
    expect(result).toEqual({
      distance: 10,
      pace: 5,
      duration: 50, // Math.round(10 * 5)
      caloriesBurned: 829, // Math.round(80 * 10 * 1.036)
    });
  });

  it("defaults pace to 6 and weight to 70 when omitted", () => {
    const result = computeLogData("run", { distance: 5 });
    expect(result).toEqual({
      distance: 5,
      pace: 6,
      duration: 30, // Math.round(5 * 6)
      caloriesBurned: 363, // Math.round(70 * 5 * 1.036)
    });
  });

  it("rounds duration and calories to integers", () => {
    const result = computeLogData("run", { distance: 3, pace: 5.5, weight: 65 });
    expect(result).toEqual({
      distance: 3,
      pace: 5.5,
      duration: Math.round(3 * 5.5),
      caloriesBurned: Math.round(65 * 3 * 1.036),
    });
  });
});

// ---------------------------------------------------------------------------
// computeLogData – "sleep" (covers calculateSleepHours + calculateSleepScore)
// ---------------------------------------------------------------------------
describe('computeLogData("sleep", ...)', () => {
  it("calculates sleep hours for same-day window (01:00 → 09:00)", () => {
    const result = computeLogData("sleep", {
      bedtime: "01:00",
      wakeTime: "09:00",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.sleepHours).toBe(8.0);
    expect(result.score).toBe(10);
    expect(result.status).toBe("success");
  });

  it("handles midnight-crossing window (23:00 → 06:00)", () => {
    // 24*60 - 23*60 + 6*60 = 60 + 360 = 420 min = 7.0 h
    const result = computeLogData("sleep", {
      bedtime: "23:00",
      wakeTime: "06:00",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.sleepHours).toBe(7.0);
    expect(result.score).toBe(10);
    expect(result.status).toBe("success");
  });

  it("deducts 2 points per hour below 7 h", () => {
    // 6 hours → score = 10 - (7-6)*2 = 8
    const result = computeLogData("sleep", {
      bedtime: "00:00",
      wakeTime: "06:00",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.sleepHours).toBe(6.0);
    expect(result.score).toBe(8);
    expect(result.status).toBe("success"); // 8 >= 7
  });

  it("deducts 2 points per hour above 8 h", () => {
    // 9 hours → score = 10 - (9-8)*2 = 8
    const result = computeLogData("sleep", {
      bedtime: "00:00",
      wakeTime: "09:00",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.sleepHours).toBe(9.0);
    expect(result.score).toBe(8);
    expect(result.status).toBe("success");
  });

  it("deducts 1 point per awakening", () => {
    // 7 hours, 3 awakenings → score = 10 - 3 = 7 → status = "success"
    const result = computeLogData("sleep", {
      bedtime: "00:00",
      wakeTime: "07:00",
      awakenings: 3,
    }) as Record<string, unknown>;

    expect(result.score).toBe(7);
    expect(result.status).toBe("success");
  });

  it("clamps score to 1 when computed value would be below 1", () => {
    // 4 hours, 10 awakenings → 10 - 6 - 10 = -6 → clamped to 1
    const result = computeLogData("sleep", {
      bedtime: "00:00",
      wakeTime: "04:00",
      awakenings: 10,
    }) as Record<string, unknown>;

    expect(result.score).toBe(1);
    expect(result.status).toBe("fail");
  });

  it("marks status as fail when score < 7", () => {
    // 5 hours, 0 awakenings → 10 - 4 = 6 → "fail"
    const result = computeLogData("sleep", {
      bedtime: "00:00",
      wakeTime: "05:00",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.status).toBe("fail");
  });

  it("rounds sleep hours to one decimal place", () => {
    // 22:30 → 06:15: 1440 - 1350 + 375 = 465 min → 7.75 h → rounded to 7.8
    const result = computeLogData("sleep", {
      bedtime: "22:30",
      wakeTime: "06:15",
      awakenings: 0,
    }) as Record<string, unknown>;

    expect(result.sleepHours).toBe(7.8);
  });
});

// ---------------------------------------------------------------------------
// computeLogData – "diet"
// ---------------------------------------------------------------------------
describe('computeLogData("diet", ...)', () => {
  it("returns score and note when no items are provided", () => {
    const result = computeLogData("diet", { score: 7, note: "Good day" }) as Record<
      string,
      unknown
    >;

    expect(result.score).toBe(7);
    expect(result.note).toBe("Good day");
    expect(result.items).toBeUndefined();
    expect(result.totals).toBeUndefined();
  });

  it("aggregates nutrient totals from items", () => {
    const items = [
      {
        id: "item-1",
        meal: "Breakfast",
        productCode: "abc",
        productName: "Oats",
        grams: 100,
        imageUrl: null,
        nutritionGrade: null,
        per100g: { calories: 350, proteins: 13, fat: 7, carbohydrates: 60 },
        totals: { calories: 350, proteins: 13, fat: 7, carbohydrates: 60 },
      },
    ];
    const result = computeLogData("diet", { items }) as Record<string, unknown>;
    const totals = result.totals as Record<string, unknown>;

    expect(totals).toBeDefined();
    expect(totals.calories).toBe(350);
    expect(totals.proteins).toBe(13);
  });

  it("preserves null nutrient values when all entries have null for that field", () => {
    const items = [
      {
        id: "item-1",
        meal: "Breakfast",
        productCode: "abc",
        productName: "Mystery Food",
        grams: 100,
        imageUrl: null,
        nutritionGrade: null,
        per100g: { calories: null, proteins: null, fat: null, carbohydrates: null },
        totals: { calories: null, proteins: null, fat: null, carbohydrates: null },
      },
    ];
    const result = computeLogData("diet", { items }) as Record<string, unknown>;
    const totals = result.totals as Record<string, unknown>;

    expect(totals.calories).toBeNull();
    expect(totals.proteins).toBeNull();
  });

  it("filters out invalid diet entries (missing meal)", () => {
    const items = [
      {
        id: "item-x",
        meal: "InvalidMeal", // not a valid meal
        productCode: "abc",
        productName: "Product",
        grams: 100,
        imageUrl: null,
        nutritionGrade: null,
        per100g: { calories: 200, proteins: 5, fat: 3, carbohydrates: 40 },
        totals: { calories: 200, proteins: 5, fat: 3, carbohydrates: 40 },
      },
    ];
    const result = computeLogData("diet", { items }) as Record<string, unknown>;

    // Entry is invalid, so no items or totals should be present
    expect(result.items).toBeUndefined();
    expect(result.totals).toBeUndefined();
  });

  it("calculates entry totals proportionally from per100g and grams", () => {
    const items = [
      {
        id: "item-1",
        meal: "Lunch",
        productCode: "xyz",
        productName: "Chicken",
        grams: 200,
        imageUrl: null,
        nutritionGrade: "a",
        per100g: { calories: 200, proteins: 30, fat: 5, carbohydrates: 0 },
        totals: { calories: 400, proteins: 60, fat: 10, carbohydrates: 0 },
      },
    ];
    const result = computeLogData("diet", { items }) as Record<string, unknown>;
    const resultItems = result.items as Array<{ totals: Record<string, unknown> }>;

    expect(resultItems[0].totals.calories).toBe(400); // 200 * 2
    expect(resultItems[0].totals.proteins).toBe(60);  // 30 * 2
  });
});

// ---------------------------------------------------------------------------
// computeLogData – "other"
// ---------------------------------------------------------------------------
describe('computeLogData("other", ...)', () => {
  it("returns completed: true when completed is true", () => {
    const result = computeLogData("other", { completed: true });
    expect(result).toEqual({ completed: true });
  });

  it("returns completed: false when completed is false", () => {
    const result = computeLogData("other", { completed: false });
    expect(result).toEqual({ completed: false });
  });
});

// ---------------------------------------------------------------------------
// isCompleted
// ---------------------------------------------------------------------------
describe("isCompleted", () => {
  describe("run", () => {
    it("returns true when distance > 0", () => {
      expect(isCompleted("run", { distance: 5 })).toBe(true);
    });

    it("returns false when distance is 0", () => {
      expect(isCompleted("run", { distance: 0 })).toBe(false);
    });
  });

  describe("diet", () => {
    it("returns true when items array is non-empty", () => {
      expect(isCompleted("diet", { items: [{}] })).toBe(true);
    });

    it("returns false when items array is empty", () => {
      expect(isCompleted("diet", { items: [] })).toBe(false);
    });

    it("falls back to score >= 5 when no items array", () => {
      expect(isCompleted("diet", { score: 5 })).toBe(true);
      expect(isCompleted("diet", { score: 6 })).toBe(true);
      expect(isCompleted("diet", { score: 4 })).toBe(false);
    });
  });

  describe("sleep", () => {
    it("returns true when status is success", () => {
      expect(isCompleted("sleep", { status: "success" })).toBe(true);
    });

    it("returns false when status is fail", () => {
      expect(isCompleted("sleep", { status: "fail" })).toBe(false);
    });
  });

  describe("other", () => {
    it("returns true when completed is true", () => {
      expect(isCompleted("other", { completed: true })).toBe(true);
    });

    it("returns false when completed is false", () => {
      expect(isCompleted("other", { completed: false })).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// getHabitStats — streak and totalCompletedDays calculation (DB mocked)
// ---------------------------------------------------------------------------
describe("getHabitStats", () => {
  function makeRunLog(id: string, date: string, distance: number) {
    return {
      id,
      habitId: "habit-1",
      date,
      data: { distance, pace: 6, duration: 30, caloriesBurned: 300 },
    };
  }

  it("returns zeros when there are no logs", async () => {
    mockOrderBy.mockResolvedValueOnce([]);

    const stats = await getHabitStats("habit-1", "run");

    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.totalCompletedDays).toBe(0);
  });

  it("calculates streak correctly with a gap in the middle", async () => {
    // Jan 1: completed, Jan 2: NOT completed, Jan 3-4: completed
    const logs = [
      makeRunLog("l1", "2024-01-01", 5),
      makeRunLog("l2", "2024-01-02", 0), // not completed
      makeRunLog("l3", "2024-01-03", 3),
      makeRunLog("l4", "2024-01-04", 4),
    ];
    mockOrderBy.mockResolvedValueOnce(logs);

    const stats = await getHabitStats("habit-1", "run");

    expect(stats.totalCompletedDays).toBe(3);
    expect(stats.bestStreak).toBe(2);
    expect(stats.currentStreak).toBe(2);
  });

  it("counts a perfect streak when all days are completed", async () => {
    const logs = [
      makeRunLog("l1", "2024-01-01", 5),
      makeRunLog("l2", "2024-01-02", 5),
      makeRunLog("l3", "2024-01-03", 5),
    ];
    mockOrderBy.mockResolvedValueOnce(logs);

    const stats = await getHabitStats("habit-1", "run");

    expect(stats.currentStreak).toBe(3);
    expect(stats.bestStreak).toBe(3);
    expect(stats.totalCompletedDays).toBe(3);
  });

  it("currentStreak is 0 when the last log is not completed", async () => {
    const logs = [
      makeRunLog("l1", "2024-01-01", 5),
      makeRunLog("l2", "2024-01-02", 0), // not completed — breaks current streak
    ];
    mockOrderBy.mockResolvedValueOnce(logs);

    const stats = await getHabitStats("habit-1", "run");

    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(1);
    expect(stats.totalCompletedDays).toBe(1);
  });

  it("includes monthlyStats for run habits", async () => {
    const logs = [
      makeRunLog("l1", "2024-01-15", 5),
      makeRunLog("l2", "2024-01-20", 3),
    ];
    mockOrderBy.mockResolvedValueOnce(logs);

    const stats = await getHabitStats("habit-1", "run");

    expect(stats.monthlyStats).toBeDefined();
    expect(stats.monthlyStats!["2024-01"].runs).toBe(2);
    expect(stats.monthlyStats!["2024-01"].distance).toBe(8);
  });

  it("does not include monthlyStats for non-run habits", async () => {
    mockOrderBy.mockResolvedValueOnce([
      { id: "l1", habitId: "h1", date: "2024-01-01", data: { status: "success", sleepHours: 8, score: 10, bedtime: "23:00", wakeTime: "07:00", awakenings: 0 } },
    ]);

    const stats = await getHabitStats("habit-1", "sleep");

    expect(stats.monthlyStats).toBeUndefined();
  });
});
