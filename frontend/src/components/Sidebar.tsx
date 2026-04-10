import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Moon,
  Sun,
  Activity,
  Apple,
  ListChecks,
  LogOut,
  Zap,
} from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Sidebar({ theme, onToggleTheme }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Zap size={20} /></div>
        <h1>HabitTracker</h1>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Overview</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <User size={20} />
          Profile
        </NavLink>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Habits</div>
        <NavLink
          to="/habits"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <ListChecks size={20} />
          All Habits
        </NavLink>
        <NavLink
          to="/sleep"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Moon size={20} />
          Sleep Control
        </NavLink>
        <NavLink
          to="/running"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Activity size={20} />
          Running Stats
        </NavLink>
        <NavLink
          to="/diet"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Apple size={20} />
          Healthy Diet
        </NavLink>
      </div>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <button type="button" className="sidebar-link sidebar-theme-toggle" onClick={onToggleTheme}>
          <span className="sidebar-theme-label">
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>
          <span className={`theme-switch ${theme === "dark" ? "active" : ""}`} aria-hidden="true">
            <span className="theme-switch-thumb" />
          </span>
        </button>
        <button className="sidebar-link" onClick={handleLogout}>
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
