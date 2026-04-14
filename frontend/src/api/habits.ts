import api from "./client";
import type { CreateHabitInput, Habit, HabitLog, HabitStats, HabitType } from "../types";

export async function getHabits(): Promise<Habit[]> {
  const { data } = await api.get<Habit[]>("/habits");
  return data;
}

export async function getHabit(id: string): Promise<Habit> {
  const { data } = await api.get<Habit>(`/habits/${id}`);
  return data;
}

export async function createHabit(
  title: string,
  type: HabitType,
  target?: string
): Promise<Habit> {
  const body: CreateHabitInput = target ? { title, type, target } : { title, type };
  const { data } = await api.post<Habit>("/habits", body);
  return data;
}

export async function deleteHabit(id: string): Promise<void> {
  await api.delete(`/habits/${id}`);
}

export async function createLog(
  habitId: string,
  body: Record<string, unknown>
): Promise<HabitLog> {
  const { data } = await api.post<HabitLog>(`/habits/${habitId}/log`, body);
  return data;
}

export async function getLogs(habitId: string): Promise<HabitLog[]> {
  const { data } = await api.get<HabitLog[]>(`/habits/${habitId}/logs`);
  return data;
}

export async function getStats(habitId: string): Promise<HabitStats> {
  const { data } = await api.get<HabitStats>(`/habits/${habitId}/stats`);
  return data;
}

export async function getOrCreateHabit(
  type: HabitType,
  title: string
): Promise<Habit> {
  const habits = await getHabits();
  const existing = habits.find((h) => h.type === type);
  if (existing) return existing;
  return createHabit(title, type);
}
