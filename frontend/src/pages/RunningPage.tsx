import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../api/profile";
import { queryKeys } from "../api/queryKeys";
import { getLocalDateString } from "../lib/date";
import { Activity } from "lucide-react";
import MonthlyCalendar from "../components/MonthlyCalendar";
import { useTrackedHabit } from "../hooks/useTrackedHabit";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TODAY = getLocalDateString();

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function RunningPage() {
  const [distance, setDistance] = useState("");
  const [pace, setPace] = useState("");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<{
    distance: number;
    duration: number;
    calories: number;
  } | null>(null);
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: getProfile,
  });
  const {
    habit: runHabit,
    habitId,
    stats,
    logs,
    createLogMutation,
    isLoading,
    hasError,
  } = useTrackedHabit({
    habitType: "run",
    cacheScope: "running",
    includeStats: true,
  });
  const userWeight = profileQuery.data?.weight ?? 70;

  const selectedLog = logs.find((log) => log.date === selectedDate);

  const syncEntryForDate = (date: string) => {
    const availableLogs = logs;
    const matchingLog = availableLogs.find((log) => log.date === date);
    const data = matchingLog?.data as Record<string, unknown> | undefined;

    setDistance(data?.distance !== undefined ? String(data.distance) : "");
    setPace(data?.pace !== undefined ? String(data.pace) : "");

    if (!data) {
      setLastResult(null);
      return;
    }

    const loggedDistance = Number(data.distance) || 0;
    const loggedPace = Number(data.pace) || 6;
    const duration = Number(data.duration) || Math.round(loggedDistance * loggedPace);
    const calories = Number(data.caloriesBurned) || Math.round(userWeight * loggedDistance * 1.036);

    setLastResult({
      distance: loggedDistance,
      duration,
      calories,
    });
  };

  useEffect(() => {
    syncEntryForDate(selectedDate);
  }, [logs, selectedDate, userWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const hadExistingLog = Boolean(selectedLog);

    const d = parseFloat(distance);
    const p = parseFloat(pace) || 6;
    if (isNaN(d) || d <= 0) {
      setError("Enter a valid distance");
      return;
    }

    const duration = Math.round(d * p);
    const calories = Math.round(userWeight * d * 1.036);

    setLastResult({ distance: d, duration, calories });

    if (habitId) {
      try {
        await createLogMutation.mutateAsync({ distance: d, pace: p, weight: userWeight, date: selectedDate });
        setMessage(hadExistingLog ? `Run updated for ${formatDateLabel(selectedDate)}.` : `Run saved for ${formatDateLabel(selectedDate)}.`);
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
          <h2>Running Stats</h2>
          <p>Track your running performance</p>
        </div>
        <div className="card">Loading running data...</div>
      </div>
    );
  }

  if (hasError || !runHabit) {
    return (
      <div>
        <div className="page-header">
          <h2>Running Stats</h2>
          <p>Track your running performance</p>
        </div>
        <div className="alert alert-error">Failed to load running data</div>
      </div>
    );
  }

  const monthlyData = stats?.monthlyStats
    ? Object.entries(stats.monthlyStats).map(([month, data]) => ({
        month,
        distance: data.distance,
        calories: data.calories,
      }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h2>Running Stats</h2>
        <p>Track your running performance</p>
      </div>

      <div className="card-grid card-grid-2">
        {/* Input */}
        <div className="card">
          <div className="card-header">
            <h3>Log Run</h3>
            <Activity size={20} style={{ color: "var(--accent)" }} />
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
                {selectedLog ? "Editing existing run entry for" : "Logging a run for"} <strong>{formatDateLabel(selectedDate)}</strong>
              </span>
              <span>{selectedLog ? "Update the fields and save." : "Click any calendar day to load it here."}</span>
            </div>
            <div className="form-group">
              <label>Distance (km)</label>
              <input
                type="number"
                step="0.1"
                placeholder="5.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pace (min/km, optional)</label>
              <input
                type="number"
                step="0.1"
                placeholder="6.0"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
              />
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>
              Weight used: {userWeight} kg (update in Profile)
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={createLogMutation.isPending}>
              {selectedLog ? "Update Run" : "Save Run"}
            </button>
          </form>
        </div>

        {/* Result & totals */}
        <div className="card">
          <div className="card-header">
            <h3>Summary</h3>
          </div>
          {lastResult ? (
            <div className="card-grid card-grid-3" style={{ gap: 12 }}>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{lastResult.distance}</div>
                <div className="stat-label">KM</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{lastResult.duration}</div>
                <div className="stat-label">Minutes</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>{lastResult.calories}</div>
                <div className="stat-label">Calories</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <Activity size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Log a run to see your summary</p>
            </div>
          )}

          {stats && (
            <div style={{ marginTop: 20, display: "flex", gap: 24, justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{stats.currentStreak}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Streak</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{stats.bestStreak}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Best</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{stats.totalCompletedDays}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Days</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Calendar */}
      {runHabit && (
        <MonthlyCalendar
          logs={logs}
          habitType="run"
          onDayClick={handleDateSelect}
          selectedDate={selectedDate}
          helperText="Pick any day to add a run or update an existing entry."
        />
      )}

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3>Monthly Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-solid)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
                labelStyle={{ color: "var(--text)" }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Bar dataKey="distance" fill="#38bdf8" radius={[6, 6, 0, 0]} name="Distance (km)" />
              <Bar dataKey="calories" fill="#4f6ef7" radius={[6, 6, 0, 0]} name="Calories" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
