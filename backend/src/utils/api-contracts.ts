import type { Habit, HabitLog, HabitType, LogData, User } from "@shared";

function toIsoDateTimeString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnlyString(value: Date | string): string {
  return value instanceof Date ? value.toISOString().split("T")[0] : value;
}

export function asHabitType(value: string): HabitType {
  if (value === "run" || value === "diet" || value === "sleep" || value === "other") {
    return value;
  }

  throw new Error(`Unknown habit type: ${value}`);
}

export function toUserDto(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  createdAt: Date | string;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    age: user.age,
    height: user.height,
    weight: user.weight,
    createdAt: toIsoDateTimeString(user.createdAt),
  };
}

export function toHabitDto(habit: {
  id: string;
  userId: string;
  title: string;
  type: string;
  target: string | null;
  createdAt: Date | string;
}): Habit {
  return {
    id: habit.id,
    userId: habit.userId,
    title: habit.title,
    type: asHabitType(habit.type),
    target: habit.target,
    createdAt: toIsoDateTimeString(habit.createdAt),
  };
}

export function toHabitLogDto(log: {
  id: string;
  habitId: string;
  date: Date | string;
  data: unknown;
}): HabitLog {
  return {
    id: log.id,
    habitId: log.habitId,
    date: toDateOnlyString(log.date),
    data: log.data as LogData,
  };
}