import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/dashboard";
import { queryKeys } from "../api/queryKeys";
import type { DashboardStats } from "../types";
import { Activity, ListChecks, TrendingUp, CheckCircle, RefreshCw } from "lucide-react";
import { formatDietLogDetails } from "../lib/diet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = ["#38bdf8", "#26b347", "#8b5cf6", "#f59e0b"];

function formatDetails(log: DashboardStats["recentLogs"][number]) {
  if (log.habitType === "run") {
    const data = log.data as { distance?: number; duration?: number };
    return `${data.distance ?? 0} km, ${data.duration ?? 0} min`;
  }

  if (log.habitType === "sleep") {
    const data = log.data as { sleepHours?: number; score?: number };
    return `${data.sleepHours ?? 0} h, score ${data.score ?? 0}`;
  }

  if (log.habitType === "diet") {
    return formatDietLogDetails(log.data);
  }

  const data = log.data as { completed?: boolean };
  return data.completed ? "Completed" : "Not completed";
}

export default function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: getDashboardStats,
  });

  const stats = dashboardQuery.data;

  if (dashboardQuery.isError) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Your habit tracking overview</p>
        </div>
        <div className="alert alert-error">Failed to load dashboard stats</div>
      </div>
    );
  }

  if (dashboardQuery.isLoading || !stats) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Loading your stats...</p>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Running", value: stats.habitsByType.run || 0 },
    { name: "Diet", value: stats.habitsByType.diet || 0 },
    { name: "Sleep", value: stats.habitsByType.sleep || 0 },
    { name: "Other", value: stats.habitsByType.other || 0 },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Today", completed: stats.today.completed, total: stats.today.total },
  ];
  const monthlyHabitData = stats.month.completedByHabit;
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Dashboard</h2>
          <p>Your habit tracking overview</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><ListChecks size={20} /></div>
          <div className="stat-value">{stats.totalHabits}</div>
          <div className="stat-label">Total Habits</div>
          <div className="stat-meta">{stats.today.completed} completed today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="stat-value">{stats.today.completed}/{stats.today.total}</div>
          <div className="stat-label">Completed Today</div>
          <div className="stat-meta">Based on saved logs for today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TrendingUp size={20} /></div>
          <div className="stat-value">{stats.month.completedDays}</div>
          <div className="stat-label">Month Completions</div>
          <div className="stat-meta">{stats.month.totalLogs} total saved entries in {monthLabel}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Activity size={20} /></div>
          <div className="stat-value">{stats.recentLogs.length}</div>
          <div className="stat-label">Recent Entries</div>
          <div className="stat-meta">Latest logged activity across all habits</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3>{monthLabel} Completion by Habit</h3>
          </div>
          {monthlyHabitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, monthlyHabitData.length * 56)}>
              <BarChart data={monthlyHabitData} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="habitTitle"
                  width={110}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="completedDays" fill="#4f6ef7" radius={[0, 6, 6, 0]} name="Completed days" />
                <Bar dataKey="loggedDays" fill="#cbd5e1" radius={[0, 6, 6, 0]} name="Logged entries" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No monthly activity yet
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Today's Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#4f6ef7" radius={[6, 6, 0, 0]} name="Completed" />
              <Bar dataKey="total" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3>Habits by Type</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No habits yet
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{monthLabel} Snapshot</h3>
          </div>
          <div className="dashboard-month-list">
            {monthlyHabitData.map((habit) => (
              <div key={habit.habitId} className="dashboard-month-item">
                <div>
                  <div className="dashboard-month-title">{habit.habitTitle}</div>
                  <div className="dashboard-month-subtitle">{habit.completedDays} completed days out of {habit.loggedDays} saved entries</div>
                </div>
                <span className={`badge badge-${habit.habitType}`}>{habit.habitType}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Activity</h3>
        </div>
        {stats.recentLogs.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Habit</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td style={{ fontWeight: 500 }}>{log.habitTitle}</td>
                    <td><span className={`badge badge-${log.habitType}`}>{log.habitType}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {formatDetails(log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>
            No activity yet. Start logging your habits!
          </p>
        )}
      </div>
    </div>
  );
}
