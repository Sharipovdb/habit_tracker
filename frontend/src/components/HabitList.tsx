import type { Habit } from "../types";
import HabitCard from "./HabitCard";

interface Props {
  habits: Habit[];
  onDelete: (id: string) => void;
}

export default function HabitList({ habits, onDelete }: Props) {
  if (habits.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>No habits yet. Create one!</p>;
  }

  return (
    <div>
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onDelete={onDelete} />
      ))}
    </div>
  );
}
