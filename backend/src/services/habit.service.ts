import { db } from "../db/index.js";
import { habits } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { HabitType } from "@shared";

export const DEFAULT_HABITS = [
  { type: "run", title: "Running Stats" },
  { type: "sleep", title: "Sleep Control" },
  { type: "diet", title: "Healthy Diet" },
] as const;

export async function ensureDefaultHabits(userId: string) {
  const existingHabits = await db.select().from(habits).where(eq(habits.userId, userId));
  const existingTypes = new Set(existingHabits.map((habit) => habit.type));
  const missingDefaults = DEFAULT_HABITS.filter((habit) => !existingTypes.has(habit.type));

  if (missingDefaults.length === 0) {
    return existingHabits;
  }

  await db
    .insert(habits)
    .values(
      missingDefaults.map((habit) => ({
        userId,
        title: habit.title,
        type: habit.type,
        target: null,
      }))
    );

  return db.select().from(habits).where(eq(habits.userId, userId));
}

export async function createHabit(
  userId: string,
  title: string,
  type: HabitType,
  target?: string | null
) {
  if (type !== "other") {
    const [existingHabit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.type, type)));

    if (existingHabit) {
      return existingHabit;
    }
  }

  const [habit] = await db
    .insert(habits)
    .values({ userId, title, type, target })
    .returning();
  return habit;
}

export async function getHabitsByUser(userId: string) {
  return ensureDefaultHabits(userId);
}

export async function getHabitById(habitId: string, userId: string) {
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  return habit || null;
}

export async function deleteHabit(habitId: string, userId: string) {
  const [deleted] = await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();
  return deleted || null;
}
