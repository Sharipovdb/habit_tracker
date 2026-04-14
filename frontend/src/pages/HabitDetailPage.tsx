import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LogForm from "../components/LogForm";
import StatsDisplay from "../components/StatsDisplay";
import { createLog, getHabit, getLogs, getStats } from "../api/habits";
import { queryKeys } from "../api/queryKeys";

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const habitQuery = useQuery({
    queryKey: id ? queryKeys.habits.detail(id) : ["habits", "detail", "missing-id"],
    queryFn: () => getHabit(id!),
    enabled: Boolean(id),
  });
  const statsQuery = useQuery({
    queryKey: id ? queryKeys.habits.stats(id) : ["habits", "stats", "missing-id"],
    queryFn: () => getStats(id!),
    enabled: Boolean(id),
  });
  const logsQuery = useQuery({
    queryKey: id ? queryKeys.habits.logs(id) : ["habits", "logs", "missing-id"],
    queryFn: () => getLogs(id!),
    enabled: Boolean(id),
  });
  const createLogMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createLog(id!, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.habits.logs(id!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.habits.stats(id!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
  });

  const habit = habitQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const logs = logsQuery.data ?? [];

  const handleLog = async (data: Record<string, unknown>) => {
    if (!id) return;
    try {
      setMessage("");
      createLogMutation.reset();
      await createLogMutation.mutateAsync(data);
      setMessage("Log submitted!");
    } catch {
      // Error is surfaced through mutation state.
    }
  };

  const mutationError = createLogMutation.error as AxiosError<{ error?: string }> | null;
  const error = habitQuery.isError || statsQuery.isError || logsQuery.isError
    ? "Failed to load habit"
    : mutationError?.response?.data?.error || (createLogMutation.isError ? "Failed to submit log" : "");

  if ((habitQuery.isLoading || statsQuery.isLoading || logsQuery.isLoading) && !habit) {
    return (
      <>
        <Navbar />
        <div className="container">{error ? <div className="alert alert-error">{error}</div> : <p>Loading...</p>}</div>
      </>
    );
  }

  if (!habit) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">{error || "Habit not found"}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <button className="btn btn-sm" onClick={() => navigate("/")} style={{ marginBottom: 16 }}>
          ← Back
        </button>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{habit.title}</h2>
            <span className={`badge badge-${habit.type}`}>{habit.type}</span>
          </div>
          {habit.target && <p style={{ color: "var(--text-secondary)" }}>Target: {habit.target}</p>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <LogForm habitType={habit.type} onSubmit={handleLog} />

        {stats && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Statistics</h3>
            <StatsDisplay stats={stats} habitType={habit.type} />
          </div>
        )}

        {logs.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Recent Logs</h3>
            <table className="monthly-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>{JSON.stringify(log.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
