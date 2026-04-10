import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import HabitList from "../components/HabitList";
import HabitForm from "../components/HabitForm";
import { getHabits, createHabit, deleteHabit } from "../api/habits";
import type { Habit, HabitType } from "../types";

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const fetchHabits = async () => {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch {
      setError("Failed to load habits");
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreate = async (data: { title: string; type: HabitType; target: string }) => {
    try {
      await createHabit(data.title, data.type, data.target || undefined);
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

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2>My Habits</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Habit"}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {showForm && <HabitForm onSubmit={handleCreate} />}
        <HabitList habits={habits} onDelete={handleDelete} />
      </div>
    </>
  );
}
