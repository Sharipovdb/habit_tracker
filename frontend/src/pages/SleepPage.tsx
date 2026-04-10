import { useState, useEffect } from "react";
import { getOrCreateHabit, createLog, getStats, getLogs } from "../api/habits";
import type { Habit, HabitStats, HabitLog } from "../types";
import { Moon } from "lucide-react";
import MonthlyCalendar from "../components/MonthlyCalendar";

const TODAY = new Date().toISOString().split("T")[0];

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calcSleepScore(hours: number, awakenings: number): number {
  let score = 10;
  if (hours < 4) score -= 5;
  else if (hours < 5) score -= 4;
  else if (hours < 6) score -= 3;
  else if (hours < 7) score -= 1.5;
  else if (hours > 9) score -= 1;
  score -= awakenings * 1.2;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export default function SleepPage() {
  const [sleepHabit, setSleepHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [hours, setHours] = useState("");
  const [awakenings, setAwakenings] = useState("");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [result, setResult] = useState<{ score: number; status: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedLog = logs.find((log) => log.date === selectedDate);

  const loadEntryForDate = (date: string, availableLogs: HabitLog[]) => {
    setSelectedDate(date);

    const matchingLog = availableLogs.find((log) => log.date === date);
    const data = matchingLog?.data as Record<string, unknown> | undefined;

    setHours(data?.sleepHours !== undefined ? String(data.sleepHours) : "");
    setAwakenings(data?.awakenings !== undefined ? String(data.awakenings) : "");

    if (!data) {
      setResult(null);
      return;
    }

    setResult({
      score: Number(data.score) || calcSleepScore(Number(data.sleepHours) || 0, Number(data.awakenings) || 0),
      status: String(data.status || (Number(data.sleepHours) >= 6 ? "success" : "fail")),
    });
  };

  useEffect(() => {
    getOrCreateHabit("sleep", "Sleep Control").then((habit) => {
      setSleepHabit(habit);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const hadExistingLog = Boolean(selectedLog);

    const h = parseFloat(hours);
    const a = parseInt(awakenings) || 0;
    if (isNaN(h) || h < 0 || h > 24) {
      setError("Enter valid sleep hours (0-24)");
      return;
    }

    const score = calcSleepScore(h, a);
    const status = h >= 6 ? "success" : "fail";
    setResult({ score, status });

    if (sleepHabit) {
      try {
        await createLog(sleepHabit.id, { sleepHours: h, awakenings: a, date: selectedDate });
        await refreshData(sleepHabit.id);
        setMessage(hadExistingLog ? `Sleep log updated for ${formatDateLabel(selectedDate)}.` : `Sleep log saved for ${formatDateLabel(selectedDate)}.`);
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
        <h2>Sleep Control</h2>
        <p>Track and analyze your sleep quality</p>
      </div>

      <div className="card-grid card-grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Log Sleep</h3>
            <Moon size={20} style={{ color: "var(--primary)" }} />
          </div>
          <form onSubmit={handleSubmit}>
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
                {selectedLog ? "Editing sleep entry for" : "Logging sleep for"} <strong>{formatDateLabel(selectedDate)}</strong>
              </span>
              <span>{selectedLog ? "Adjust values and save to update it." : "Choose any day from the calendar."}</span>
            </div>
            <div className="form-group">
              <label>Sleep Hours</label>
              <input
                type="number"
                step="0.5"
                placeholder="7.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Awakenings During Night</label>
              <input
                type="number"
                placeholder="0"
                value={awakenings}
                onChange={(e) => setAwakenings(e.target.value)}
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              {selectedLog ? "Update Sleep Log" : "Save Sleep Log"}
            </button>
          </form>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {result ? (
            <>
              <div
                className="score-circle"
                style={{
                  borderColor: result.score >= 7 ? "var(--success)" : result.score >= 4 ? "var(--warning)" : "var(--danger)",
                  background: result.score >= 7 ? "var(--success-bg)" : result.score >= 4 ? "var(--warning-bg)" : "var(--danger-bg)",
                }}
              >
                <div className="score-value" style={{
                  color: result.score >= 7 ? "var(--success)" : result.score >= 4 ? "var(--warning)" : "var(--danger)",
                }}>{result.score}</div>
                <div className="score-label">Score</div>
              </div>
              <p style={{ marginTop: 16, fontWeight: 600, textTransform: "uppercase", fontSize: "0.85rem" }}>
                {result.status === "success" ? (
                  <span style={{ color: "var(--success)" }}>Good Sleep</span>
                ) : (
                  <span style={{ color: "var(--danger)" }}>Needs Improvement</span>
                )}
              </p>
              <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center" }}>
                {result.score >= 8
                  ? "Excellent! You're well-rested."
                  : result.score >= 6
                  ? "Decent sleep. Try to reduce interruptions."
                  : result.score >= 4
                  ? "Below average. Aim for 7-8 hours."
                  : "Poor quality. Consider adjusting your routine."}
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <Moon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Enter your sleep data to see your quality score</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="card-grid card-grid-3" style={{ marginTop: 24 }}>
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
      {sleepHabit && (
        <MonthlyCalendar
          logs={logs}
          habitType="sleep"
          onDayClick={handleDateSelect}
          selectedDate={selectedDate}
          helperText="Select any day to add sleep data or revise an existing score."
        />
      )}
    </div>
  );
}
