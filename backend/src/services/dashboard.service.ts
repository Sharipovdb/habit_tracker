import { db } from "../db";
import { habits, habitLogs } from "../db/schema";
import { eq, and, desc, gte, inArray, lte } from "drizzle-orm";
import { ensureDefaultHabits } from "./habit.service";
import { isCompleted } from "./log.service";

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getDashboardStats(userId: string) {
  const userHabits = await ensureDefaultHabits(userId);
  const todayDate = new Date();
  const today = formatDate(todayDate);
  const monthStart = formatDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const monthEnd = formatDate(new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0));
  const habitIds = userHabits.map((habit) => habit.id);
  const habitMap = new Map(userHabits.map((habit) => [habit.id, habit]));

  const emptyStats = {
    totalHabits: userHabits.length,
    habitsByType: {
      run: userHabits.filter((habit) => habit.type === "run").length,
      diet: userHabits.filter((habit) => habit.type === "diet").length,
      sleep: userHabits.filter((habit) => habit.type === "sleep").length,
      other: userHabits.filter((habit) => habit.type === "other").length,
    },
    today: { completed: 0, total: userHabits.length },
    month: {
      completedDays: 0,
      totalLogs: 0,
      completedByHabit: userHabits.map((habit) => ({
        habitId: habit.id,
        habitTitle: habit.title,
        habitType: habit.type,
        completedDays: 0,
        loggedDays: 0,
      })),
    },
    recentLogs: [] as Array<{
      id: string;
      habitId: string;
      date: string;
      data: unknown;
      habitTitle: string;
      habitType: string;
    }>,
  };

  if (habitIds.length === 0) {
    return emptyStats;
  }

  const [todayLogs, monthlyLogs, recentLogs] = await Promise.all([
    db
      .select()
      .from(habitLogs)
      .where(and(inArray(habitLogs.habitId, habitIds), eq(habitLogs.date, today))),
    db
      .select()
      .from(habitLogs)
      .where(
        and(
          inArray(habitLogs.habitId, habitIds),
          gte(habitLogs.date, monthStart),
          lte(habitLogs.date, monthEnd)
        )
      ),
    db
      .select()
      .from(habitLogs)
      .where(inArray(habitLogs.habitId, habitIds))
      .orderBy(desc(habitLogs.date), desc(habitLogs.id))
      .limit(10),
  ]);

  const completedByHabit = new Map(
    userHabits.map((habit) => [
      habit.id,
      {
        habitId: habit.id,
        habitTitle: habit.title,
        habitType: habit.type,
        completedDays: 0,
        loggedDays: 0,
      },
    ])
  );

  let todayCompleted = 0;
  for (const log of todayLogs) {
    const habit = habitMap.get(log.habitId);
    if (!habit) {
      continue;
    }

    if (isCompleted(habit.type, log.data as Record<string, unknown>)) {
      todayCompleted += 1;
    }
  }

  for (const log of monthlyLogs) {
    const habit = habitMap.get(log.habitId);
    const summary = completedByHabit.get(log.habitId);
    if (!habit || !summary) {
      continue;
    }

    summary.loggedDays += 1;
    if (isCompleted(habit.type, log.data as Record<string, unknown>)) {
      summary.completedDays += 1;
    }
  }

  const monthlySummary = Array.from(completedByHabit.values())
    .sort((left, right) => right.completedDays - left.completedDays || left.habitTitle.localeCompare(right.habitTitle));

  return {
    totalHabits: userHabits.length,
    habitsByType: emptyStats.habitsByType,
    today: {
      completed: todayCompleted,
      total: userHabits.length,
    },
    month: {
      completedDays: monthlySummary.reduce((sum, habit) => sum + habit.completedDays, 0),
      totalLogs: monthlyLogs.length,
      completedByHabit: monthlySummary,
    },
    recentLogs: recentLogs.map((log) => {
      const habit = habitMap.get(log.habitId);

      return {
        ...log,
        habitTitle: habit?.title ?? "Unknown Habit",
        habitType: habit?.type ?? "other",
      };
    }),
  };
}
