import type { HabitStats as StatsType } from "../types";

interface Props {
  stats: StatsType;
  habitType: string;
}

export default function StatsDisplay({ stats, habitType }: Props) {
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{stats.currentStreak}</div>
          <div className="label">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.bestStreak}</div>
          <div className="label">Best Streak</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.totalCompletedDays}</div>
          <div className="label">Total Completed</div>
        </div>
      </div>

      {habitType === "run" && stats.monthlyStats && (
        <div className="card">
          <h3>Monthly Run Stats</h3>
          <table className="monthly-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Distance (km)</th>
                <th>Calories</th>
                <th>Runs</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.monthlyStats).map(([month, data]) => (
                <tr key={month}>
                  <td>{month}</td>
                  <td>{data.distance}</td>
                  <td>{data.calories}</td>
                  <td>{data.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
