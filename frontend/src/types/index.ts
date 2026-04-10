export interface User {
  id: string;
  email: string;
  name?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type HabitType = "run" | "diet" | "sleep" | "other";

export interface Habit {
  id: string;
  userId: string;
  title: string;
  type: HabitType;
  target: string | null;
  createdAt: string;
}

export interface RunLogData {
  distance: number;
  pace: number;
  duration: number;
  caloriesBurned: number;
}

export interface DietLogData {
  score: number;
  note?: string;
}

export interface SleepLogData {
  sleepHours: number;
  awakenings: number;
  score: number;
  status: "success" | "fail";
}

export interface OtherLogData {
  completed: boolean;
}

export type LogData = RunLogData | DietLogData | SleepLogData | OtherLogData;

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  data: LogData;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletedDays: number;
  monthlyStats?: Record<string, { distance: number; calories: number; runs: number }>;
}

export interface DashboardStats {
  totalHabits: number;
  habitsByType: Record<string, number>;
  today: { completed: number; total: number };
  month: {
    completedDays: number;
    totalLogs: number;
    completedByHabit: Array<{
      habitId: string;
      habitTitle: string;
      habitType: HabitType;
      completedDays: number;
      loggedDays: number;
    }>;
  };
  recentLogs: Array<{
    id: string;
    habitId: string;
    date: string;
    data: LogData;
    habitTitle: string;
    habitType: HabitType;
  }>;
}
