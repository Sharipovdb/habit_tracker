import type { Habit } from "../types";
import { useNavigate } from "react-router-dom";

interface Props {
  habit: Habit;
  onDelete: (id: string) => void;
}

export default function HabitCard({ habit, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>{habit.title}</h3>
        <span className={`badge badge-${habit.type}`}>{habit.type}</span>
      </div>
      {habit.target && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Target: {habit.target}
        </p>
      )}
      <div className="habit-actions">
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/habits/${habit.id}`)}>
          View / Log
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(habit.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
