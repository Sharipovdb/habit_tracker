import type { DietFoodEntry, DietLogData, FoodNutrients } from "../types";

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