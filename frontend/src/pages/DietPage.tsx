import { useState, useEffect } from "react";
import { getOrCreateHabit, createLog, getStats, getLogs } from "../api/habits";
import type { Habit, HabitStats, HabitLog } from "../types";
import { Apple } from "lucide-react";
import MonthlyCalendar from "../components/MonthlyCalendar";

const FOOD_LEVELS = [
  {
    level: 5,
    label: "Very Healthy",
    examples: "Buckwheat, eggs, cottage cheese, nuts, vegetables, fish",
    color: "#22c55e",
  },
  {
    level: 4,
    label: "Healthy",
    examples: "Rice, chicken, fruits, yogurt, whole grain bread",
    color: "#84cc16",
  },
  {
    level: 3,
    label: "Moderate",
    examples: "Pasta, sandwiches, juice, mild sauces",
    color: "#f59e0b",
  },
  {
    level: 2,
    label: "Unhealthy",
    examples: "White bread, fried food, sweets, heavy cream",
    color: "#f97316",
  },
  {
    level: 1,
    label: "Very Unhealthy",
    examples: "Chips, soda, candy, fast food, energy drinks",
    color: "#ef4444",
  },
];

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;
const TODAY = new Date().toISOString().split("T")[0];
type MealName = (typeof MEALS)[number];
type MealSelections = Partial<Record<MealName, number>>;

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildDietNote(selections: MealSelections) {
  return `Breakfast: ${selections.Breakfast}/5, Lunch: ${selections.Lunch}/5, Dinner: ${selections.Dinner}/5`;
}

function parseDietSelections(note?: string) {
  if (!note) {
    return {};
  }

  const match = note.match(/Breakfast:\s*(\d)\/5,\s*Lunch:\s*(\d)\/5,\s*Dinner:\s*(\d)\/5/i);
  if (!match) {
    return {};
  }

  return {
    Breakfast: Number(match[1]),
    Lunch: Number(match[2]),
    Dinner: Number(match[3]),
  };
}

export default function DietPage() {
  const [dietHabit, setDietHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [selections, setSelections] = useState<MealSelections>({});
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedLog = logs.find((log) => log.date === selectedDate);

  const loadEntryForDate = (date: string, availableLogs: HabitLog[]) => {
    setSelectedDate(date);

    const matchingLog = availableLogs.find((log) => log.date === date);
    const data = matchingLog?.data as Record<string, unknown> | undefined;

    if (!data) {
      setSelections({});
      setFinalScore(null);
      return;
    }

    setSelections(parseDietSelections(typeof data.note === "string" ? data.note : undefined));
    setFinalScore(typeof data.score === "number" ? data.score : Number(data.score) || null);
  };

  useEffect(() => {
    getOrCreateHabit("diet", "Healthy Diet").then((habit) => {
      setDietHabit(habit);
      getStats(habit.id).then(setStats).catch(() => {});
      getLogs(habit.id)
        .then((logsData) => {
          setLogs(logsData);
          loadEntryForDate(TODAY, logsData);
        })
        .catch(() => {});
    });
  }, []);

  const refreshData = async (habitId: string) => {
    const [newStats, newLogs] = await Promise.all([
      getStats(habitId),
      getLogs(habitId),
    ]);
    setStats(newStats);
    setLogs(newLogs);
    loadEntryForDate(selectedDate, newLogs);
  };

  const handleSelect = (meal: MealName, level: number) => {
    setSelections((prev) => ({ ...prev, [meal]: level }));
  };

  const handleSubmit = async () => {
    setMessage("");
    setError("");

    const hadExistingLog = Boolean(selectedLog);
    const breakfast = selections.Breakfast;
    const lunch = selections.Lunch;
    const dinner = selections.Dinner;

    if (breakfast === undefined || lunch === undefined || dinner === undefined) {
      setError("Select a level for all three meals");
      return;
    }

    const avg =
      Math.round(
        ((breakfast + lunch + dinner) / 3) * 10
      ) / 10;
    const score = Math.round(avg * 2); // Scale 1-5 to 2-10
    setFinalScore(score);

    if (dietHabit) {
      try {
        await createLog(dietHabit.id, {
          score,
          note: buildDietNote(selections),
          date: selectedDate,
        });
        await refreshData(dietHabit.id);
        setMessage(hadExistingLog ? `Diet log updated for ${formatDateLabel(selectedDate)}.` : `Diet log saved for ${formatDateLabel(selectedDate)}.`);
      } catch {
        setError("Failed to save log");
      }
    }
  };

  const handleDateSelect = (date: string) => {
    loadEntryForDate(date, logs);
    setMessage("");
    setError("");
  };

  return (
    <div>
      <div className="page-header">
        <h2>Healthy Diet</h2>
        <p>Rate your meals and track nutrition quality</p>
      </div>

      {!dietHabit && (
        <div className="alert alert-error">
          Loading diet habit...
        </div>
      )}

      {/* Food quality reference */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Food Quality Guide</h3>
          <Apple size={20} style={{ color: "var(--success)" }} />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th>Rating</th>
                <th>Examples</th>
              </tr>
            </thead>
            <tbody>
              {FOOD_LEVELS.map((f) => (
                <tr key={f.level}>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: f.color + "18",
                        color: f.color,
                        fontWeight: 700,
                        textAlign: "center",
                        lineHeight: "28px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {f.level}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{f.label}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{f.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meal selection */}
      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Rate Your Meals</h3>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
            />
          </div>
          <div className="selected-log-note">
            <span>
              {selectedLog ? "Editing meal ratings for" : "Logging meals for"} <strong>{formatDateLabel(selectedDate)}</strong>
            </span>
            <span>{selectedLog ? "Adjust meal levels and save to update." : "Use the calendar to jump to any day."}</span>
          </div>
          {MEALS.map((meal) => (
            <div key={meal} style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 500, marginBottom: 8, fontSize: "0.9rem" }}>
                {meal}
              </label>
              <div className="level-picker">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-btn level-${lvl} ${selections[meal] === lvl ? "selected" : ""}`}
                    onClick={() => handleSelect(meal, lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}>
            {selectedLog ? "Update Diet Log" : "Save Diet Log"}
          </button>
        </div>

        {/* Score result */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {finalScore !== null ? (
            <>
              <div
                className="score-circle"
                style={{
                  borderColor: finalScore >= 7 ? "var(--success)" : finalScore >= 4 ? "var(--warning)" : "var(--danger)",
                  background: finalScore >= 7 ? "var(--success-bg)" : finalScore >= 4 ? "var(--warning-bg)" : "var(--danger-bg)",
                }}
              >
                <div
                  className="score-value"
                  style={{
                    color: finalScore >= 7 ? "var(--success)" : finalScore >= 4 ? "var(--warning)" : "var(--danger)",
                  }}
                >
                  {finalScore}
                </div>
                <div className="score-label">/ 10</div>
              </div>
              <p style={{ marginTop: 16, fontWeight: 600, fontSize: "0.9rem" }}>
                {finalScore >= 8
                  ? "Excellent nutrition today!"
                  : finalScore >= 6
                  ? "Good eating habits. Keep it up!"
                  : finalScore >= 4
                  ? "Room for improvement."
                  : "Try to include healthier options."}
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <Apple size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Rate all three meals to see your score</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="card-grid card-grid-3">
          <div className="stat-card">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.bestStreak}</div>
            <div className="stat-label">Best Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalCompletedDays}</div>
            <div className="stat-label">Total Days</div>
          </div>
        </div>
      )}

      {/* Monthly Calendar */}
      {dietHabit && (
        <MonthlyCalendar
          logs={logs}
          habitType="diet"
          onDayClick={handleDateSelect}
          selectedDate={selectedDate}
          helperText="Pick any day to add meal ratings or revise the saved score."
        />
      )}
    </div>
  );
}
