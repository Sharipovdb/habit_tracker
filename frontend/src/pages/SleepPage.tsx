import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import MonthlyCalendar from "../components/MonthlyCalendar";
import { useTrackedHabit } from "../hooks/useTrackedHabit";
import { getLocalDateString } from "../lib/date";

const TODAY = getLocalDateString();
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function calculateSleepHours(bedtime: string, wakeTime: string): number {
  const bedtimeMinutes = parseTimeToMinutes(bedtime);
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  const durationMinutes = wakeMinutes <= bedtimeMinutes
    ? 24 * 60 - bedtimeMinutes + wakeMinutes
    : wakeMinutes - bedtimeMinutes;

  return Math.round((durationMinutes / 60) * 10) / 10;
}

function calcSleepScore(hours: number, awakenings: number): number {
  let score = 10;

  if (hours < 7) {
    score -= (7 - hours) * 2;
  } else if (hours > 8) {
    score -= (hours - 8) * 2;
  }

  score -= awakenings;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

type SleepResult = {
  score: number;
  status: string;
  sleepHours: number;
};

export default function SleepPage() {
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [awakenings, setAwakenings] = useState("");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [result, setResult] = useState<SleepResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    habit: sleepHabit,
    habitId,
    stats,
    logs,
    createLogMutation,
    isLoading,
    hasError,
  } = useTrackedHabit({
    habitType: "sleep",
    cacheScope: "sleep",
    includeStats: true,
  });

  const selectedLog = logs.find((log) => log.date === selectedDate);

  const syncEntryForDate = (date: string) => {
    const matchingLog = logs.find((log) => log.date === date);
    const data = matchingLog?.data as Record<string, unknown> | undefined;

    setBedtime(typeof data?.bedtime === "string" ? data.bedtime : "");
    setWakeTime(typeof data?.wakeTime === "string" ? data.wakeTime : "");
    setAwakenings(data?.awakenings !== undefined ? String(data.awakenings) : "");

    if (!data) {
      setResult(null);
      return;
    }

    const computedHours = Number(data.sleepHours)
      || (typeof data.bedtime === "string" && typeof data.wakeTime === "string"
        ? calculateSleepHours(data.bedtime, data.wakeTime)
        : 0);
    const score = Number(data.score) || calcSleepScore(computedHours, Number(data.awakenings) || 0);
    const status = String(data.status || (score >= 7 ? "success" : "fail"));

    setResult({
      score,
      status,
      sleepHours: computedHours,
    });
  };

  useEffect(() => {
    syncEntryForDate(selectedDate);
  }, [logs, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const hadExistingLog = Boolean(selectedLog);
    const bedtimeValue = bedtime.trim();
    const wakeTimeValue = wakeTime.trim();
    const awakeningCount = parseInt(awakenings, 10) || 0;

    if (!bedtimeValue || !wakeTimeValue) {
      setError("Enter bedtime and wake-up time");
      return;
    }

    if (!TIME_PATTERN.test(bedtimeValue) || !TIME_PATTERN.test(wakeTimeValue)) {
      setError("Enter valid times in HH:MM format");
      return;
    }

    if (bedtimeValue === wakeTimeValue) {
      setError("Bedtime and wake-up time cannot be the same");
      return;
    }

    if (awakeningCount < 0) {
      setError("Awakenings cannot be negative");
      return;
    }

    const sleepHours = calculateSleepHours(bedtimeValue, wakeTimeValue);
    const score = calcSleepScore(sleepHours, awakeningCount);
    const status = score >= 7 ? "success" : "fail";
    setResult({ score, status, sleepHours });

    if (habitId) {
      try {
        await createLogMutation.mutateAsync({
          bedtime: bedtimeValue,
          wakeTime: wakeTimeValue,
          awakenings: awakeningCount,
          date: selectedDate,
        });
        setMessage(hadExistingLog ? `Sleep log updated for ${formatDateLabel(selectedDate)}.` : `Sleep log saved for ${formatDateLabel(selectedDate)}.`);
      } catch {
        setError("Failed to save log");
      }
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setMessage("");
    setError("");
  };

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <h2>Sleep Control</h2>
          <p>Track and analyze your sleep quality</p>
        </div>
        <div className="card">Loading sleep data...</div>
      </div>
    );
  }

  if (hasError || !sleepHabit) {
    return (
      <div>
        <div className="page-header">
          <h2>Sleep Control</h2>
          <p>Track and analyze your sleep quality</p>
        </div>
        <div className="alert alert-error">Failed to load sleep data</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Sleep Control</h2>
        <p>Track bedtime, wake-up time, and interruptions automatically</p>
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
              <label>Bedtime</label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Wake Up Time</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Awakenings During Night</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={awakenings}
                onChange={(e) => setAwakenings(e.target.value)}
              />
            </div>
            <p style={{ marginTop: -4, marginBottom: 16, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              7-8 hours gives 10 points. Less or more reduces the score, and each awakening removes 1 point.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={createLogMutation.isPending}>
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
              <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: 600 }}>
                {result.sleepHours} hours slept
              </p>
              <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center" }}>
                {result.score >= 8
                  ? "Ideal duration and few interruptions."
                  : result.score >= 6
                  ? "Close to target. Fewer awakenings will help."
                  : result.score >= 4
                  ? "Below target. Aim for 7-8 hours of sleep."
                  : "Sleep quality is low. Review schedule and interruptions."}
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <Moon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Enter bedtime and wake-up time to calculate sleep quality</p>
            </div>
          )}
        </div>
      </div>

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