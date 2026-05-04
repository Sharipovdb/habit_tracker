import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, Search, Trash2 } from "lucide-react";
import { createLog, getHabits, getLogs } from "../api/habits";
import { searchFood } from "../api/food";
import { getProfile } from "../api/profile";
import { queryKeys } from "../api/queryKeys";
import { formatDateLabel, getLocalDateString } from "../lib/date";
import MonthlyCalendar from "../components/MonthlyCalendar";
import {
  aggregateFoodTotals,
  calculateBmi,
  calculateDietTargets,
  calculateFoodTotals,
  DIET_ACTIVITY_LABELS,
  DIET_GOAL_LABELS,
  formatDietLogDetails,
  formatNutritionValue,
  getBmiCategoryLabel,
  getDietEntries,
  getDietLogActivityLevel,
  getDietLogGoal,
  getDietLogTargets,
  getRecommendedDietGoal,
} from "../lib/diet";
import type { DietActivityLevel, DietFoodEntry, DietGoal, DietMealName, FoodSearchItem } from "../types";

const MEALS: DietMealName[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const TODAY = getLocalDateString();
const DIET_GOAL_OPTIONS: Array<{ value: DietGoal; description: string }> = [
  { value: "cut", description: "Lower calories to reduce weight while keeping protein high." },
  { value: "maintain", description: "Match your daily energy needs and keep your current shape." },
  { value: "bulk", description: "Add a controlled calorie surplus to support weight gain." },
];
const ACTIVITY_LEVEL_OPTIONS: Array<{ value: DietActivityLevel; description: string }> = [
  { value: "light", description: "Light activity and easy day-to-day movement." },
  { value: "medium", description: "Regular training or a moderately active routine." },
  { value: "high", description: "Hard training volume or a very active lifestyle." },
];

function buildEntry(product: FoodSearchItem, meal: DietMealName, grams: number): DietFoodEntry {
  return {
    id: crypto.randomUUID(),
    meal,
    productCode: product.code,
    productName: product.name,
    grams,
    imageUrl: product.imageUrl,
    nutritionGrade: product.nutritionGrade,
    per100g: product.per100g,
    totals: calculateFoodTotals(product.per100g, grams),
  };
}

function summarizeEntry(entry: DietFoodEntry) {
  return `${entry.productName} ${entry.grams}g`;
}

function formatWholeNumber(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return Math.round(value).toString();
}

export default function DietPage() {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [draftEntries, setDraftEntries] = useState<DietFoodEntry[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<DietMealName>("Breakfast");
  const [selectedProduct, setSelectedProduct] = useState<FoodSearchItem | null>(null);
  const [gramsInput, setGramsInput] = useState("100");
  const [goal, setGoal] = useState<DietGoal>("maintain");
  const [activityLevel, setActivityLevel] = useState<DietActivityLevel>("medium");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [legacyMessage, setLegacyMessage] = useState("");
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: getProfile,
  });

  const habitsQuery = useQuery({
    queryKey: queryKeys.habits.all,
    queryFn: getHabits,
  });

  const dietHabit = habitsQuery.data?.find((habit) => habit.type === "diet") ?? null;
  const habitId = dietHabit?.id;
  const logsQuery = useQuery({
    queryKey: habitId ? queryKeys.habits.logs(habitId) : ["habits", "logs", "diet"],
    queryFn: () => getLogs(habitId!),
    enabled: Boolean(habitId),
  });
  const foodSearchQuery = useQuery({
    queryKey: queryKeys.food.search(submittedQuery),
    queryFn: () => searchFood(submittedQuery),
    enabled: submittedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
  const createLogMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createLog(habitId!, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.habits.logs(habitId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
  });

  const logs = logsQuery.data ?? [];
  const searchResults = foodSearchQuery.data?.items ?? [];
  const selectedLog = logs.find((log) => log.date === selectedDate);
  const profileHeight = profileQuery.data?.height ?? null;
  const profileWeight = profileQuery.data?.weight ?? null;
  const profileBmi = calculateBmi(profileHeight, profileWeight);
  const defaultGoal = profileBmi === null ? "maintain" : getRecommendedDietGoal(profileBmi);
  const savedGoal = getDietLogGoal(selectedLog?.data);
  const savedActivityLevel = getDietLogActivityLevel(selectedLog?.data);
  const savedTargets = getDietLogTargets(selectedLog?.data);
  const grams = Number(gramsInput);
  const draftTotals = aggregateFoodTotals(draftEntries);
  const showSearchResults = foodSearchQuery.isFetching || (!selectedProduct && submittedQuery.length >= 2);
  const selectedProductTotals =
    selectedProduct && Number.isFinite(grams) && grams > 0
      ? calculateFoodTotals(selectedProduct.per100g, grams)
      : null;
  const calculatedTargets = calculateDietTargets({
    heightCm: profileHeight,
    weightKg: profileWeight,
    goal,
    activityLevel,
  });
  const canReuseSavedTargets = Boolean(savedTargets && savedGoal === goal && savedActivityLevel === activityLevel);
  const activeTargets = calculatedTargets ?? (canReuseSavedTargets ? savedTargets : null);
  const activeBmi = activeTargets?.bmi ?? profileBmi;
  const recommendedGoal = activeTargets?.recommendedGoal ?? (profileBmi === null ? null : getRecommendedDietGoal(profileBmi));
  const calorieProgressPercent =
    activeTargets && draftTotals.calories !== null ? Math.round((draftTotals.calories / activeTargets.targetCalories) * 100) : null;
  const proteinProgressPercent =
    activeTargets && draftTotals.proteins !== null ? Math.round((draftTotals.proteins / activeTargets.targetProtein) * 100) : null;
  const calorieProgressWidth = calorieProgressPercent === null ? 0 : Math.max(0, Math.min(calorieProgressPercent, 100));
  const proteinProgressWidth = proteinProgressPercent === null ? 0 : Math.max(0, Math.min(proteinProgressPercent, 100));
  const calorieDelta = activeTargets && draftTotals.calories !== null ? Math.round(draftTotals.calories - activeTargets.targetCalories) : null;
  const hasProfileMetrics = Boolean(profileHeight && profileWeight);

  useEffect(() => {
    const data = selectedLog?.data;
    setGoal(getDietLogGoal(data) ?? defaultGoal);
    setActivityLevel(getDietLogActivityLevel(data) ?? "medium");

    if (!data) {
      setDraftEntries([]);
      setLegacyMessage("");
      return;
    }

    const nextEntries = getDietEntries(data);
    setDraftEntries(nextEntries);

    if (nextEntries.length === 0) {
      const summary = formatDietLogDetails(data);
      setLegacyMessage(
        summary !== "Diet log"
          ? `This day has a legacy diet log: ${summary}. Saving new food entries will replace it.`
          : ""
      );
      return;
    }

    setLegacyMessage("");
  }, [defaultGoal, selectedLog]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setMessage("");
    setError("");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const query = searchInput.trim();
    if (query.length < 2) {
      setError("Enter at least 2 characters before searching.");
      return;
    }

    setSelectedProduct(null);
    if (query === submittedQuery) {
      void foodSearchQuery.refetch();
      return;
    }

    setSubmittedQuery(query);
  };

  const handleAddEntry = () => {
    setMessage("");
    setError("");

    if (!selectedProduct) {
      setError("Select a product from the search results first.");
      return;
    }

    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a valid grams value greater than 0.");
      return;
    }

    setDraftEntries((prev) => [...prev, buildEntry(selectedProduct, selectedMeal, grams)]);
    setGramsInput("100");
  };

  const handleRemoveEntry = (entryId: string) => {
    setDraftEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    setMessage("");
    setError("");

    if (draftEntries.length === 0) {
      setError("Add at least one food entry before saving.");
      return;
    }

    try {
      const targetsToSave = calculatedTargets ?? (canReuseSavedTargets ? savedTargets : null);
      await createLogMutation.mutateAsync({
        items: draftEntries,
        totals: draftTotals,
        goal,
        activityLevel,
        ...(targetsToSave ? { targets: targetsToSave } : {}),
        date: selectedDate,
      });
      setLegacyMessage("");
      setMessage(
        selectedLog
          ? `Diet log updated for ${formatDateLabel(selectedDate)}.`
          : `Diet log saved for ${formatDateLabel(selectedDate)}.`
      );
    } catch {
      setError("Failed to save diet log.");
    }
  };

  const hasQueryError = habitsQuery.isError || logsQuery.isError;
  const searchError = foodSearchQuery.error instanceof Error ? foodSearchQuery.error.message : "Failed to search food.";

  if (habitsQuery.isLoading || (habitId && logsQuery.isLoading)) {
    return (
      <div>
        <div className="page-header">
          <h2>Healthy Diet</h2>
          <p>Search real products, calculate macros, and save your daily nutrition.</p>
        </div>
        <div className="card">Loading diet data...</div>
      </div>
    );
  }

  if (hasQueryError || !dietHabit) {
    return (
      <div>
        <div className="page-header">
          <h2>Healthy Diet</h2>
          <p>Search real products, calculate macros, and save your daily nutrition.</p>
        </div>
        <div className="alert alert-error">Failed to load diet data</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Healthy Diet</h2>
        <p>Search Open Food Facts, calculate calories and macros, and build a real food log.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Daily Nutrition Log</h3>
          <Apple size={20} style={{ color: "var(--success)" }} />
        </div>
        <div className="selected-log-note">
          <span>
            {selectedLog ? "Editing nutrition log for" : "Building nutrition log for"} <strong>{formatDateLabel(selectedDate)}</strong>
          </span>
          <span>Search is manual to stay within Open Food Facts rate limits.</span>
        </div>
        <div className="diet-plan-grid">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={selectedDate} onChange={(event) => handleDateSelect(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Goal</label>
            <select value={goal} onChange={(event) => setGoal(event.target.value as DietGoal)}>
              {DIET_GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{DIET_GOAL_LABELS[option.value]}</option>
              ))}
            </select>
            <div className="diet-plan-hint">{DIET_GOAL_OPTIONS.find((option) => option.value === goal)?.description}</div>
          </div>
          <div className="form-group">
            <label>Activity Factor</label>
            <select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value as DietActivityLevel)}>
              {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{DIET_ACTIVITY_LABELS[option.value]}</option>
              ))}
            </select>
            <div className="diet-plan-hint">{ACTIVITY_LEVEL_OPTIONS.find((option) => option.value === activityLevel)?.description}</div>
          </div>
        </div>
        <div className="diet-target-note">
          {activeTargets ? (
            <>
              <span>
                BMI <strong>{activeBmi?.toFixed(1)}</strong>
                {activeTargets.bmiCategory ? ` • ${getBmiCategoryLabel(activeTargets.bmiCategory)}` : ""}
                {recommendedGoal ? ` • Recommended mode: ${DIET_GOAL_LABELS[recommendedGoal]}` : ""}
              </span>
              <span>TDEE uses activity factor <strong>{activeTargets.activityFactor}x</strong>.</span>
            </>
          ) : hasProfileMetrics ? (
            <span>Choose goal and activity to calculate your daily calorie and protein targets.</span>
          ) : (
            <span>Fill in height and weight on the profile page to unlock BMI, calorie target, and protein target.</span>
          )}
        </div>
        {legacyMessage && <div className="alert alert-error">{legacyMessage}</div>}
        {profileQuery.isError && <div className="alert alert-error">Profile metrics could not be loaded. Nutrition targets are temporarily unavailable.</div>}
      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div className="card">
          <div className="card-header">
            <h3>Search Products</h3>
          </div>

          <form onSubmit={handleSearchSubmit} className="diet-search-form">
            <div className="diet-search-row">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search for yogurt, chicken, oats..."
              />
              <button className="btn btn-primary" type="submit" disabled={foodSearchQuery.isFetching}>
                <Search size={16} /> Search
              </button>
            </div>
            <p className="diet-search-hint">The app uses a backend proxy so the external API stays behind your own server.</p>
          </form>

          {foodSearchQuery.isError && <div className="alert alert-error">{searchError}</div>}

          {selectedProduct && !foodSearchQuery.isFetching && (
            <div className="search-selection-banner">
              <span>Selected: <strong>{selectedProduct.name}</strong></span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSelectedProduct(null);
                  setSearchInput("");
                }}
              >
                Choose another
              </button>
            </div>
          )}

          {showSearchResults && (
            <div className="food-search-list">
              {foodSearchQuery.isFetching && <div className="diet-empty-state">Searching products...</div>}
              {!foodSearchQuery.isFetching && submittedQuery && searchResults.length === 0 && !foodSearchQuery.isError && (
                <div className="diet-empty-state">No products found for "{submittedQuery}".</div>
              )}

              {searchResults.map((product) => {
                const isSelected = selectedProduct?.code === product.code;

                return (
                  <button
                    key={product.code}
                    type="button"
                    className={`food-result ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchInput(product.name);
                    }}
                  >
                    <div className="food-result-media">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} />
                      ) : (
                        <div className="food-image-placeholder"><Apple size={18} /></div>
                      )}
                    </div>
                    <div className="food-result-content">
                      <div className="food-result-headline">
                        <strong>{product.name}</strong>
                        {product.nutritionGrade && (
                          <span className="nutrition-grade-badge">Grade {product.nutritionGrade.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="macro-grid compact">
                        <div className="macro-item">
                          <span>Calories</span>
                          <strong>{formatNutritionValue(product.per100g.calories, "kcal")}</strong>
                        </div>
                        <div className="macro-item">
                          <span>Protein</span>
                          <strong>{formatNutritionValue(product.per100g.proteins, "g")}</strong>
                        </div>
                        <div className="macro-item">
                          <span>Fat</span>
                          <strong>{formatNutritionValue(product.per100g.fat, "g")}</strong>
                        </div>
                        <div className="macro-item">
                          <span>Carbs</span>
                          <strong>{formatNutritionValue(product.per100g.carbohydrates, "g")}</strong>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Selected Product</h3>
          </div>

          {selectedProduct ? (
            <div className="diet-product-panel">
              <div className="food-result-headline" style={{ marginBottom: 14 }}>
                <div>
                  <strong>{selectedProduct.name}</strong>
                  <div className="diet-product-code">Code: {selectedProduct.code}</div>
                </div>
                {selectedProduct.nutritionGrade && (
                  <span className="nutrition-grade-badge">Grade {selectedProduct.nutritionGrade.toUpperCase()}</span>
                )}
              </div>

              <div className="diet-selection-grid">
                <div className="form-group">
                  <label>Meal</label>
                  <select value={selectedMeal} onChange={(event) => setSelectedMeal(event.target.value as DietMealName)}>
                    {MEALS.map((meal) => (
                      <option key={meal} value={meal}>{meal}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Grams</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={gramsInput}
                    onChange={(event) => setGramsInput(event.target.value)}
                  />
                </div>
              </div>

              <div className="macro-grid">
                <div className="macro-item">
                  <span>Per 100 g</span>
                  <strong>{formatNutritionValue(selectedProduct.per100g.calories, "kcal")}</strong>
                  <small>P {formatNutritionValue(selectedProduct.per100g.proteins, "g")} / F {formatNutritionValue(selectedProduct.per100g.fat, "g")} / C {formatNutritionValue(selectedProduct.per100g.carbohydrates, "g")}</small>
                </div>
                <div className="macro-item emphasis">
                  <span>For your portion</span>
                  <strong>{selectedProductTotals ? formatNutritionValue(selectedProductTotals.calories, "kcal") : "-"}</strong>
                  <small>
                    P {selectedProductTotals ? formatNutritionValue(selectedProductTotals.proteins, "g") : "-"} / F {selectedProductTotals ? formatNutritionValue(selectedProductTotals.fat, "g") : "-"} / C {selectedProductTotals ? formatNutritionValue(selectedProductTotals.carbohydrates, "g") : "-"}
                  </small>
                </div>
              </div>

              <button className="btn btn-primary" type="button" onClick={handleAddEntry}>
                Add To Daily Log
              </button>
            </div>
          ) : (
            <div className="diet-empty-state">Pick a product from the search results to calculate your portion.</div>
          )}
        </div>
      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div className="card">
          <div className="card-header">
            <h3>Saved For {formatDateLabel(selectedDate)}</h3>
          </div>

          {draftEntries.length > 0 ? (
            <div className="diet-entry-list">
              {draftEntries.map((entry) => (
                <div key={entry.id} className="diet-entry-item">
                  <div className="diet-entry-meta">
                    <div>
                      <div className="diet-entry-title">{entry.meal}: {summarizeEntry(entry)}</div>
                      <div className="diet-entry-subtitle">
                        {formatNutritionValue(entry.totals.calories, "kcal")} | P {formatNutritionValue(entry.totals.proteins, "g")} | F {formatNutritionValue(entry.totals.fat, "g")} | C {formatNutritionValue(entry.totals.carbohydrates, "g")}
                      </div>
                    </div>
                    <button className="btn btn-ghost" type="button" onClick={() => handleRemoveEntry(entry.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="diet-empty-state">No food entries for this day yet.</div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={handleSave} disabled={createLogMutation.isPending}>
            {selectedLog ? "Update Diet Log" : "Save Diet Log"}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Daily Totals</h3>
          </div>

          <div className="macro-grid">
            <div className="macro-item emphasis">
              <span>Calories</span>
              <strong>{formatNutritionValue(draftTotals.calories, "kcal")}</strong>
            </div>
            <div className="macro-item">
              <span>Protein</span>
              <strong>{formatNutritionValue(draftTotals.proteins, "g")}</strong>
            </div>
            <div className="macro-item">
              <span>Fat</span>
              <strong>{formatNutritionValue(draftTotals.fat, "g")}</strong>
            </div>
            <div className="macro-item">
              <span>Carbs</span>
              <strong>{formatNutritionValue(draftTotals.carbohydrates, "g")}</strong>
            </div>
          </div>

          <div className="selected-log-note" style={{ marginTop: 18 }}>
            <span>{draftEntries.length > 0 ? `${draftEntries.length} tracked food item${draftEntries.length === 1 ? "" : "s"}` : "Add food items to build totals."}</span>
            <span>Unknown nutrient values stay blank instead of being faked as zero.</span>
          </div>

          {activeTargets ? (
            <div className="diet-progress-panel">
              <div className="diet-progress-header">
                <strong>Daily target progress</strong>
                <span>
                  {draftTotals.calories !== null
                    ? `${formatWholeNumber(draftTotals.calories)} / ${activeTargets.targetCalories} kcal`
                    : `0 / ${activeTargets.targetCalories} kcal`}
                </span>
              </div>
              <div className="diet-progress-track">
                <div
                  className={`diet-progress-fill${calorieProgressPercent !== null && calorieProgressPercent > 100 ? " is-over" : ""}`}
                  style={{ width: `${calorieProgressWidth}%` }}
                />
              </div>
              <div className="diet-progress-caption">
                {calorieProgressPercent === null
                  ? "Calories will appear here as soon as selected foods have known values."
                  : calorieProgressPercent <= 100
                    ? `${calorieProgressPercent}% of the daily calorie target completed.`
                    : `${calorieProgressPercent}% of the daily calorie target completed, ${Math.abs(calorieDelta ?? 0)} kcal above target.`}
              </div>
            </div>
          ) : (
            <div className="diet-day-total">Add height and weight in your profile to see daily calorie and protein targets.</div>
          )}

          {selectedLog && getDietEntries(selectedLog.data).length > 0 && (
            <div className="diet-day-total">Saved snapshot: {formatDietLogDetails(selectedLog.data)}</div>
          )}
        </div>
      </div>

      <div className="card-grid card-grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{activeTargets ? `${activeTargets.targetCalories}` : "—"}</div>
          <div className="stat-label">Daily Calorie Target</div>
          <div className="stat-meta">
            {activeTargets
              ? `${DIET_GOAL_LABELS[goal]} • ${DIET_ACTIVITY_LABELS[activityLevel]} ${activeTargets.activityFactor}x`
              : "Needs height and weight from your profile"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{calorieProgressPercent !== null ? `${calorieProgressPercent}%` : "—"}</div>
          <div className="stat-label">Calorie Progress</div>
          <div className="stat-meta">
            {activeTargets && draftTotals.calories !== null
              ? calorieProgressPercent !== null && calorieProgressPercent > 100
                ? `${Math.abs(calorieDelta ?? 0)} kcal above the plan`
                : `${formatWholeNumber(draftTotals.calories)} of ${activeTargets.targetCalories} kcal consumed`
              : "Add foods with known calories to track progress"}
          </div>
          {activeTargets && (
            <div className="diet-mini-progress-track">
              <div
                className={`diet-mini-progress-fill${calorieProgressPercent !== null && calorieProgressPercent > 100 ? " is-over" : ""}`}
                style={{ width: `${calorieProgressWidth}%` }}
              />
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeTargets ? `${formatWholeNumber(activeTargets.targetProtein)}g` : "—"}</div>
          <div className="stat-label">Daily Protein Target</div>
          <div className="stat-meta">
            {activeTargets && draftTotals.proteins !== null
              ? `${proteinProgressPercent ?? 0}% completed • ${formatNutritionValue(draftTotals.proteins, "g")} eaten`
              : "Protein target is calculated from weight and goal"}
          </div>
          {activeTargets && (
            <div className="diet-mini-progress-track">
              <div className="diet-mini-progress-fill" style={{ width: `${proteinProgressWidth}%` }} />
            </div>
          )}
        </div>
      </div>

      <MonthlyCalendar
        logs={logs}
        habitType="diet"
        onDayClick={handleDateSelect}
        selectedDate={selectedDate}
        helperText="Pick any day to inspect or replace a saved nutrition snapshot."
      />
    </div>
  );
}
