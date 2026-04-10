import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LogForm from "../components/LogForm";
import StatsDisplay from "../components/StatsDisplay";
import { getStats, createLog, getLogs } from "../api/habits";
import type { Habit, HabitLog, HabitStats } from "../types";
import api from "../api/client";

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const { data: habitData } = await api.get<Habit>(`/habits/${id}`);
        setHabit(habitData);

        const statsData = await getStats(id);
        setStats(statsData);

        const logsData = await getLogs(id);
        setLogs(logsData);
      } catch {
        setError("Failed to load habit");
      }
    };
    fetchData();
  }, [id]);

  const handleLog = async (data: Record<string, unknown>) => {
    if (!id) return;
    try {
      setMessage("");
      setError("");
      await createLog(id, data);
      setMessage("Log submitted!");

      // Refresh stats and logs
      const statsData = await getStats(id);
      setStats(statsData);
      const logsData = await getLogs(id);
      setLogs(logsData);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError("Already logged today!");
      } else {
        setError("Failed to submit log");
      }
    }
  };

  if (!habit) {
    return (
      <>
        <Navbar />
        <div className="container">{error ? <div className="alert alert-error">{error}</div> : <p>Loading...</p>}</div>
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
