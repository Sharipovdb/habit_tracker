import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  getHabits,
  createHabit,
  deleteHabit,
  createLog,
  getLogs,
} from "../api/habits";
import type { Habit, HabitLog } from "../types";
import { Plus, Trash2 } from "lucide-react";
import MonthlyCalendar from "../components/MonthlyCalendar";

export default function OtherHabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm<{ title: string; target: string }>();

  const fetchHabits = async () => {
    const all = await getHabits();
    const otherHabits = all.filter((h) => h.type === "other");
    setHabits(otherHabits);

    const logsMap: Record<string, HabitLog[]> = {};
    await Promise.all(
      otherHabits.map(async (h) => {
        logsMap[h.id] = await getLogs(h.id);
      })
    );
    setHabitLogs(logsMap);
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const onCreateHabit = async (data: { title: string; target: string }) => {
    try {
      await createHabit(data.title, "other", data.target || undefined);
      reset();
      setShowForm(false);
      fetchHabits();
    } catch {
      setError("Failed to create habit");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setError("Failed to delete habit");
    }
  };

  const handleDayClick = async (habitId: string, date: string) => {
    try {
      setMessage("");
      setError("");

      const existingLogs = habitLogs[habitId] || [];
      const existing = existingLogs.find((l) => l.date === date);
      const wasCompleted = existing && (existing.data as unknown as Record<string, unknown>).completed === true;

      await createLog(habitId, { completed: !wasCompleted, date });

      // Refresh logs for this habit
      const newLogs = await getLogs(habitId);
      setHabitLogs((prev) => ({ ...prev, [habitId]: newLogs }));
    } catch {
      setError("Failed to update log");
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Other Habits</h2>
          <p>Create and track custom daily habits</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? "Cancel" : "New Habit"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit(onCreateHabit)} className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>Create Habit</h3>
          </div>
          <div className="form-group">
            <label>Habit Name</label>
            <input placeholder="e.g. Read 30 minutes" {...register("title", { required: true })} />
          </div>
          <div className="form-group">
            <label>Target (optional)</label>
            <input placeholder="e.g. Finish 12 books this year" {...register("target")} />
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      {habits.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <p>No custom habits yet. Create one to get started!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {habits.map((habit) => (
            <div key={habit.id}>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{habit.title}</div>
                  {habit.target && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{habit.target}</div>
                  )}
                </div>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDelete(habit.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <MonthlyCalendar
                logs={habitLogs[habit.id] || []}
                habitType="other"
                onDayClick={(date) => handleDayClick(habit.id, date)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
