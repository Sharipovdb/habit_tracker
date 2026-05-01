import { useNavigate } from "react-router-dom";
import { Moon, Activity, Apple, ListChecks } from "lucide-react";

export default function HabitsPage() {
  const navigate = useNavigate();

  const cards = [
    {
      icon: <Moon size={24} />,
      title: "Sleep Control",
      desc: "Log bedtime, wake-up time, and awakenings for an automatic sleep score",
      path: "/sleep",
      colorClass: "sleep",
    },
    {
      icon: <Activity size={24} />,
      title: "Running Stats",
      desc: "Log distance, pace, and track calories burned",
      path: "/running",
      colorClass: "run",
    },
    {
      icon: <Apple size={24} />,
      title: "Healthy Diet",
      desc: "Rate your meals and get a daily nutrition score",
      path: "/diet",
      colorClass: "diet",
    },
    {
      icon: <ListChecks size={24} />,
      title: "Other Habits",
      desc: "Create custom habits and track daily completion",
      path: "/other-habits",
      colorClass: "other",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Habits</h2>
        <p>Choose a habit category to track</p>
      </div>

      <div className="habit-type-grid">
        {cards.map((c) => (
          <div
            key={c.path}
            className={`habit-type-card habit-type-card--${c.colorClass}`}
            onClick={() => navigate(c.path)}
          >
            <div className={`type-icon ${c.colorClass}`}>{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
