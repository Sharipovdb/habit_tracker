import { db } from "../db";
import { habitLogs } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { DietFoodEntry, DietLogData, FoodNutrients, HabitStats, HabitType, LogData } from "@shared";

const DIET_MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundToSingleDecimal(value);
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return roundToSingleDecimal(numericValue);
    }
  }

  return null;
}

function normalizeNutrients(value: unknown): FoodNutrients {
  const nutrients = (value as Partial<FoodNutrients> | undefined) ?? {};

  return {
    calories: asNullableNumber(nutrients.calories),
    proteins: asNullableNumber(nutrients.proteins),
    fat: asNullableNumber(nutrients.fat),
    carbohydrates: asNullableNumber(nutrients.carbohydrates),
  };
}

function calculateEntryTotals(per100g: FoodNutrients, grams: number): FoodNutrients {
  const factor = grams / 100;

  return {
    calories: per100g.calories === null ? null : roundToSingleDecimal(per100g.calories * factor),
    proteins: per100g.proteins === null ? null : roundToSingleDecimal(per100g.proteins * factor),
    fat: per100g.fat === null ? null : roundToSingleDecimal(per100g.fat * factor),
    carbohydrates: per100g.carbohydrates === null ? null : roundToSingleDecimal(per100g.carbohydrates * factor),
  };
}

function aggregateDietTotals(entries: DietFoodEntry[]): FoodNutrients {
  const sumField = (field: keyof FoodNutrients): number | null => {
    let total = 0;
    let hasKnownValue = false;

    for (const entry of entries) {
      const value = entry.totals[field];
      if (value === null) {
        continue;
      }

      hasKnownValue = true;
      total += value;
    }

    return hasKnownValue ? roundToSingleDecimal(total) : null;
  };

  return {
    calories: sumField("calories"),
    proteins: sumField("proteins"),
    fat: sumField("fat"),
    carbohydrates: sumField("carbohydrates"),
  };
}

function buildDietNote(entries: DietFoodEntry[]): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const groupedEntries = new Map<string, string[]>();
  for (const entry of entries) {
    const items = groupedEntries.get(entry.meal) ?? [];
    items.push(`${entry.productName} ${entry.grams}g`);
    groupedEntries.set(entry.meal, items);
  }

  return Array.from(groupedEntries.entries())
    .map(([meal, items]) => `${meal}: ${items.join(", ")}`)
    .join("; ");
}

function normalizeDietEntries(value: unknown): DietFoodEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      const candidate = (entry as Partial<DietFoodEntry> | undefined) ?? {};
      const meal = typeof candidate.meal === "string" && DIET_MEALS.includes(candidate.meal as typeof DIET_MEALS[number])
        ? candidate.meal
        : null;
      const productCode = typeof candidate.productCode === "string" ? candidate.productCode.trim() : "";
      const productName = typeof candidate.productName === "string" ? candidate.productName.trim() : "";
      const gramsValue = asNullableNumber(candidate.grams);

      if (!meal || !productCode || !productName || gramsValue === null || gramsValue <= 0) {
        return null;
      }

      const per100g = normalizeNutrients(candidate.per100g);
      const grams = roundToSingleDecimal(gramsValue);

      return {
        id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `${productCode}-${index}`,
        meal,
        productCode,
        productName,
        grams,
        imageUrl: typeof candidate.imageUrl === "string" && candidate.imageUrl.trim() ? candidate.imageUrl : null,
        nutritionGrade: typeof candidate.nutritionGrade === "string" && candidate.nutritionGrade.trim()
          ? candidate.nutritionGrade
          : null,
        per100g,
        totals: calculateEntryTotals(per100g, grams),
      };
    })
    .filter((entry): entry is DietFoodEntry => entry !== null);
}

export function computeLogData(
  type: HabitType,
  input: Record<string, unknown>
): LogData {
  switch (type) {
    case "run": {
      const distance = input.distance as number;
      const pace = (input.pace as number) || 6;
      const duration = Math.round(distance * pace);
      const weight = (input.weight as number) || 70;
      // ~1.036 kcal per kg per km is a standard running approximation
      const caloriesBurned = Math.round(weight * distance * 1.036);
      return { distance, pace, duration, caloriesBurned };
    }
    case "diet": {
      const items = normalizeDietEntries(input.items);
      const totals = items.length > 0 ? aggregateDietTotals(items) : normalizeNutrients(input.totals);
      const score = asNullableNumber(input.score) ?? undefined;
      const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : buildDietNote(items);

      return {
        ...(score !== undefined ? { score } : {}),
        ...(note ? { note } : {}),
        ...(items.length > 0 ? { items } : {}),
        ...(items.length > 0 || Object.values(totals).some((value) => value !== null) ? { totals } : {}),
      } satisfies DietLogData;
    }
    case "sleep": {
      const sleepHours = input.sleepHours as number;
      const awakenings = (input.awakenings as number) || 0;
      let score = 10;
      if (sleepHours < 4) score -= 5;
      else if (sleepHours < 5) score -= 4;
      else if (sleepHours < 6) score -= 3;
      else if (sleepHours < 7) score -= 1.5;
      else if (sleepHours > 9) score -= 1;
      score -= awakenings * 1.2;
      score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));
      const status: "success" | "fail" = sleepHours >= 6 ? "success" : "fail";
      return { sleepHours, awakenings, score, status };
    }
    case "other": {
      return { completed: input.completed as boolean };
    }
    default:
      throw new Error(`Unknown habit type: ${type}`);
  }
}

export async function createLog(
  habitId: string,
  date: string,
  data: LogData
) {
  // Check for existing log on the same day — upsert
  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(habitLogs)
      .set({ data })
      .where(eq(habitLogs.id, existing[0].id))
      .returning();
    return { updated: true, log: updated };
  }

  const [log] = await db
    .insert(habitLogs)
    .values({ habitId, date, data })
    .returning();
  return { updated: false, log };
}

export async function getLogsByHabit(habitId: string) {
  return db
    .select()
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(habitLogs.date);
}

export function isCompleted(type: HabitType, data: Record<string, unknown>): boolean {
  switch (type) {
    case "run":
      return (data.distance as number) > 0;
    case "diet":
      return Array.isArray(data.items) ? data.items.length > 0 : (data.score as number) >= 5;
    case "sleep":
      return data.status === "success";
    case "other":
      return data.completed === true;
    default:
      return false;
  }
}

export async function getHabitStats(habitId: string, type: HabitType): Promise<HabitStats> {
  const logs = await getLogsByHabit(habitId);

  let bestStreak = 0;
  let totalCompletedDays = 0;
  let tempStreak = 0;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const data = sorted[i].data as Record<string, unknown>;
    if (isCompleted(type, data)) {
      totalCompletedDays++;
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const data = sorted[i].data as Record<string, unknown>;
    if (isCompleted(type, data)) {
      currentStreak++;
    } else {
      break;
    }
  }

  const result: HabitStats = {
    currentStreak,
    bestStreak,
    totalCompletedDays,
  };

  if (type === "run") {
    const monthlyStats: Record<string, { distance: number; calories: number; runs: number }> = {};
    for (const log of sorted) {
      const data = log.data as Record<string, unknown>;
      const month = log.date.substring(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { distance: 0, calories: 0, runs: 0 };
      }
      monthlyStats[month].distance += (data.distance as number) || 0;
      monthlyStats[month].calories += (data.caloriesBurned as number) || 0;
      monthlyStats[month].runs++;
    }
    result.monthlyStats = monthlyStats;
  }

  return result;
}
