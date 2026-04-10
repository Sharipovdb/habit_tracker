import { db } from "../db";
import { habitLogs } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RunData {
  distance: number;
  pace: number;
  duration: number;
  caloriesBurned: number;
}

interface DietData {
  score: number;
  note?: string;
}

interface SleepData {
  sleepHours: number;
  awakenings: number;
  score: number;
  status: "success" | "fail";
}

interface OtherData {
  completed: boolean;
}

export type LogData = RunData | DietData | SleepData | OtherData;

export function computeLogData(
  type: string,
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
      return {
        score: input.score as number,
        note: (input.note as string) || undefined,
      };
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

export function isCompleted(type: string, data: Record<string, unknown>): boolean {
  switch (type) {
    case "run":
      return (data.distance as number) > 0;
    case "diet":
      return (data.score as number) >= 5;
    case "sleep":
      return data.status === "success";
    case "other":
      return data.completed === true;
    default:
      return false;
  }
}

export async function getHabitStats(habitId: string, type: string) {
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

  const result: Record<string, unknown> = {
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
