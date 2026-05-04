import { db } from "../db/index.js";
import { habits, habitLogs } from "../db/schema.js";
import { eq, and, desc, gte, inArray, lte } from "drizzle-orm";
import { ensureDefaultHabits } from "./habit.service.js";
import { isCompleted } from "./log.service.js";
import type { DashboardStats } from "@shared";
import { asHabitType, toDateOnlyString } from "../utils/api-contracts.js";

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const userHabits = await ensureDefaultHabits(userId);
  const todayDate = new Date();
  const today = toDateOnlyString(todayDate);
  const monthStart = toDateOnlyString(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const monthEnd = toDateOnlyString(new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0));
  const habitIds = userHabits.map((habit) => habit.id);
  const habitMap = new Map(userHabits.map((habit) => [habit.id, habit]));
  const habitsByType = userHabits.reduce<DashboardStats["habitsByType"]>(
    (counts, habit) => {
      counts[asHabitType(habit.type)] += 1;
      return counts;
    },
    {
      run: 0,
      diet: 0,
      sleep: 0,
      other: 0,
    }
  );

  const emptyStats: DashboardStats = {
    totalHabits: userHabits.length,
    habitsByType,
    today: { completed: 0, total: userHabits.length },
    month: {
      completedDays: 0,
      totalLogs: 0,
      completedByHabit: userHabits.map((habit) => ({
        habitId: habit.id,
        habitTitle: habit.title,
        habitType: asHabitType(habit.type),
        completedDays: 0,
        loggedDays: 0,
      })),
    },
    recentLogs: [],
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
        habitType: asHabitType(habit.type),
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

    if (isCompleted(asHabitType(habit.type), log.data as Record<string, unknown>)) {
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
    if (isCompleted(asHabitType(habit.type), log.data as Record<string, unknown>)) {
      summary.completedDays += 1;
    }
  }

  const monthlySummary = Array.from(completedByHabit.values())
    .sort((left, right) => right.completedDays - left.completedDays || left.habitTitle.localeCompare(right.habitTitle));

  return {
    totalHabits: userHabits.length,
    habitsByType,
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
        date: toDateOnlyString(log.date),
        data: log.data as DashboardStats["recentLogs"][number]["data"],
        habitTitle: habit?.title ?? "Unknown Habit",
        habitType: habit ? asHabitType(habit.type) : "other",
      };
    }),
  };
}
