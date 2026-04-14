import type {
  BmiCategory,
  DietActivityLevel,
  DietFoodEntry,
  DietGoal,
  DietLogData,
  DietTargets,
  FoodNutrients,
} from "../types";

const DIET_GOALS = ["cut", "maintain", "bulk"] as const;
const DIET_ACTIVITY_LEVELS = ["light", "medium", "high"] as const;

export const DIET_ACTIVITY_FACTORS: Record<DietActivityLevel, number> = {
  light: 1.375,
  medium: 1.55,
  high: 1.725,
};

export const DIET_GOAL_LABELS: Record<DietGoal, string> = {
  cut: "Lose Weight",
  maintain: "Maintain Shape",
  bulk: "Gain Weight",
};

export const DIET_ACTIVITY_LABELS: Record<DietActivityLevel, string> = {
  light: "Light",
  medium: "Medium",
  high: "High",
};

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

export function normalizeFoodNutrients(value: unknown): FoodNutrients {
  const nutrients = (value as Partial<FoodNutrients> | undefined) ?? {};

  return {
    calories: asNullableNumber(nutrients.calories),
    proteins: asNullableNumber(nutrients.proteins),
    fat: asNullableNumber(nutrients.fat),
    carbohydrates: asNullableNumber(nutrients.carbohydrates),
  };
}

export function calculateFoodTotals(per100g: FoodNutrients, grams: number): FoodNutrients {
  const factor = grams / 100;

  return {
    calories: per100g.calories === null ? null : roundToSingleDecimal(per100g.calories * factor),
    proteins: per100g.proteins === null ? null : roundToSingleDecimal(per100g.proteins * factor),
    fat: per100g.fat === null ? null : roundToSingleDecimal(per100g.fat * factor),
    carbohydrates: per100g.carbohydrates === null ? null : roundToSingleDecimal(per100g.carbohydrates * factor),
  };
}

export function aggregateFoodTotals(entries: DietFoodEntry[]): FoodNutrients {
  const sumField = (field: keyof FoodNutrients): number | null => {
    let total = 0;
    let hasKnownValue = false;

    for (const entry of entries) {
      const value = entry.totals[field];
      if (value === null) {
        continue;
      }

      total += value;
      hasKnownValue = true;
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

export function getDietEntries(value: unknown): DietFoodEntry[] {
  const data = (value as DietLogData | undefined) ?? {};
  if (!Array.isArray(data.items)) {
    return [];
  }

  return data.items
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as DietFoodEntry;
      if (!candidate.id || !candidate.productCode || !candidate.productName || !candidate.meal) {
        return null;
      }

      const grams = asNullableNumber(candidate.grams);
      if (grams === null || grams <= 0) {
        return null;
      }

      const per100g = normalizeFoodNutrients(candidate.per100g);

      return {
        id: candidate.id,
        meal: candidate.meal,
        productCode: candidate.productCode,
        productName: candidate.productName,
        grams,
        imageUrl: candidate.imageUrl ?? null,
        nutritionGrade: candidate.nutritionGrade ?? null,
        per100g,
        totals: normalizeFoodNutrients(candidate.totals ?? calculateFoodTotals(per100g, grams)),
      } satisfies DietFoodEntry;
    })
    .filter((entry): entry is DietFoodEntry => entry !== null);
}

export function getDietTotals(value: unknown): FoodNutrients {
  const data = (value as DietLogData | undefined) ?? {};
  const items = getDietEntries(value);

  if (items.length > 0) {
    return aggregateFoodTotals(items);
  }

  return normalizeFoodNutrients(data.totals);
}

export function formatNutritionValue(value: number | null, unit: "kcal" | "g"): string {
  if (value === null) {
    return "-";
  }

  return `${value}${unit}`;
}

export function formatDietLogDetails(value: unknown): string {
  const data = (value as DietLogData | undefined) ?? {};
  const items = getDietEntries(value);

  if (items.length > 0) {
    const totals = aggregateFoodTotals(items);
    const meals = new Set(items.map((entry) => entry.meal)).size;
    const calories = totals.calories === null ? "calories unknown" : `${totals.calories} kcal`;
    const itemLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
    const mealLabel = `${meals} meal${meals === 1 ? "" : "s"}`;

    return `${itemLabel} across ${mealLabel}, ${calories}`;
  }

  if (typeof data.note === "string" && data.note.trim()) {
    return data.note;
  }

  if (typeof data.score === "number") {
    return `Score ${data.score}`;
  }

  return "Diet log";
}

export function getDietCalendarDisplay(value: unknown): { label: string; level: "good" | "medium" | "bad" } {
  const data = (value as DietLogData | undefined) ?? {};
  const items = getDietEntries(value);

  if (items.length > 0) {
    return {
      label: `${items.length}x`,
      level: items.length >= 3 ? "good" : "medium",
    };
  }

  const score = typeof data.score === "number" ? data.score : 0;
  return {
    label: `${score}`,
    level: score >= 7 ? "good" : score >= 4 ? "medium" : "bad",
  };
}

function isDietGoal(value: unknown): value is DietGoal {
  return typeof value === "string" && DIET_GOALS.includes(value as DietGoal);
}

function isDietActivityLevel(value: unknown): value is DietActivityLevel {
  return typeof value === "string" && DIET_ACTIVITY_LEVELS.includes(value as DietActivityLevel);
}

export function roundNutritionValue(value: number): number {
  return roundToSingleDecimal(value);
}

export function calculateBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightInMeters = heightCm / 100;
  return roundToSingleDecimal(weightKg / (heightInMeters * heightInMeters));
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) {
    return "underweight";
  }

  if (bmi < 25) {
    return "normal";
  }

  if (bmi < 30) {
    return "overweight";
  }

  return "obese";
}

export function getBmiCategoryLabel(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "Underweight";
    case "normal":
      return "Normal";
    case "overweight":
      return "Overweight";
    case "obese":
      return "Obese";
    default:
      return "Unknown";
  }
}

export function getRecommendedDietGoal(bmi: number): DietGoal {
  if (bmi < 18.5) {
    return "bulk";
  }

  if (bmi > 25) {
    return "cut";
  }

  return "maintain";
}

function calculateTargetWeight(heightCm: number): number {
  const heightInMeters = heightCm / 100;
  return roundToSingleDecimal(24.9 * heightInMeters * heightInMeters);
}

export function calculateDietTargets(params: {
  heightCm?: number | null;
  weightKg?: number | null;
  goal: DietGoal;
  activityLevel: DietActivityLevel;
}): DietTargets | null {
  const { heightCm, weightKg, goal, activityLevel } = params;
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const bmi = calculateBmi(heightCm, weightKg);
  if (bmi === null) {
    return null;
  }

  const bmiCategory = getBmiCategory(bmi);
  const recommendedGoal = getRecommendedDietGoal(bmi);
  const activityFactor = DIET_ACTIVITY_FACTORS[activityLevel];
  const bmr = weightKg * 24;
  const tdee = bmr * activityFactor;

  let targetCalories = tdee;
  let proteinMultiplier = 1.4;

  if (goal === "cut") {
    targetCalories = tdee - 400;
    proteinMultiplier = 2;
  } else if (goal === "bulk") {
    targetCalories = tdee + 300;
    proteinMultiplier = 1.8;
  }

  targetCalories = Math.max(1200, Math.round(targetCalories));

  const proteinWeight = goal === "cut" && bmi > 30 ? Math.min(weightKg, calculateTargetWeight(heightCm)) : weightKg;
  const targetProtein = roundToSingleDecimal(proteinWeight * proteinMultiplier);

  return {
    bmi,
    bmiCategory,
    recommendedGoal,
    activityFactor,
    targetCalories,
    targetProtein,
  } satisfies DietTargets;
}

export function getDietGoal(value: unknown): DietGoal | null {
  return isDietGoal(value) ? value : null;
}

export function getDietActivityLevel(value: unknown): DietActivityLevel | null {
  return isDietActivityLevel(value) ? value : null;
}

export function getDietTargets(value: unknown): DietTargets | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DietTargets>;
  const goal = getDietGoal(candidate.recommendedGoal);
  const bmiCategoryValue = candidate.bmiCategory;
  const bmiCategory =
    bmiCategoryValue === "underweight" ||
    bmiCategoryValue === "normal" ||
    bmiCategoryValue === "overweight" ||
    bmiCategoryValue === "obese"
      ? bmiCategoryValue
      : null;
  const bmi = asNullableNumber(candidate.bmi);
  const targetCalories = asNullableNumber(candidate.targetCalories);
  const targetProtein = asNullableNumber(candidate.targetProtein);
  const activityFactor = asNullableNumber(candidate.activityFactor);

  if (targetCalories === null || targetCalories <= 0 || targetProtein === null || targetProtein <= 0 || activityFactor === null) {
    return null;
  }

  return {
    bmi,
    bmiCategory,
    recommendedGoal: goal,
    activityFactor,
    targetCalories,
    targetProtein,
  } satisfies DietTargets;
}

export function getDietLogGoal(value: unknown): DietGoal | null {
  const data = (value as DietLogData | undefined) ?? {};
  return getDietGoal(data.goal);
}

export function getDietLogActivityLevel(value: unknown): DietActivityLevel | null {
  const data = (value as DietLogData | undefined) ?? {};
  return getDietActivityLevel(data.activityLevel);
}

export function getDietLogTargets(value: unknown): DietTargets | null {
  const data = (value as DietLogData | undefined) ?? {};
  return getDietTargets(data.targets);
}