export type HabitType = "run" | "diet" | "sleep" | "other";

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

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface CreateHabitInput {
  title: string;
  type: HabitType;
  target?: string;
}

export interface UpdateProfileInput {
  name?: string;
  age?: number;
  height?: number;
  weight?: number;
}

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

export type DietMealName = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface FoodNutrients {
  calories: number | null;
  proteins: number | null;
  fat: number | null;
  carbohydrates: number | null;
}

export interface FoodSearchItem {
  code: string;
  name: string;
  imageUrl: string | null;
  nutritionGrade: string | null;
  per100g: FoodNutrients;
}

export interface FoodSearchResponse {
  query: string;
  items: FoodSearchItem[];
}

export interface DietFoodEntry {
  id: string;
  meal: DietMealName;
  productCode: string;
  productName: string;
  grams: number;
  imageUrl: string | null;
  nutritionGrade: string | null;
  per100g: FoodNutrients;
  totals: FoodNutrients;
}

export type DietGoal = "cut" | "maintain" | "bulk";

export type DietActivityLevel = "light" | "medium" | "high";

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export interface DietTargets {
  bmi: number | null;
  bmiCategory: BmiCategory | null;
  recommendedGoal: DietGoal | null;
  activityFactor: number;
  targetCalories: number;
  targetProtein: number;
}

export interface DietLogData {
  score?: number;
  note?: string;
  items?: DietFoodEntry[];
  totals?: FoodNutrients;
  goal?: DietGoal;
  activityLevel?: DietActivityLevel;
  targets?: DietTargets;
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
  habitsByType: Record<HabitType, number>;
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