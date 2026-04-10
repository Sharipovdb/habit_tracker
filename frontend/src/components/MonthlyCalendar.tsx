import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HabitLog, HabitType } from "../types";

interface Props {
  logs: HabitLog[];
  habitType: HabitType;
  onDayClick?: (date: string) => void;
  selectedDate?: string;
  helperText?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

function getLogDisplay(
  log: HabitLog,
  type: HabitType
): { label: string; level: "good" | "medium" | "bad" } {
  const data = log.data as unknown as Record<string, unknown>;
  switch (type) {
    case "sleep": {
      const score = (data.score as number) ?? 0;
      return {
        label: `${score}`,
        level: score >= 7 ? "good" : score >= 4 ? "medium" : "bad",
      };
    }
    case "run": {
      const dist = (data.distance as number) ?? 0;
      return {
        label: `${dist}km`,
        level: dist >= 5 ? "good" : dist >= 2 ? "medium" : "bad",
      };
    }
    case "diet": {
      const score = (data.score as number) ?? 0;
      return {
        label: `${score}`,
        level: score >= 7 ? "good" : score >= 4 ? "medium" : "bad",
      };
    }
    case "other": {
      const completed = data.completed as boolean;
      return {
        label: completed ? "✓" : "✗",
        level: completed ? "good" : "bad",
      };
    }
  }
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatSelectedDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MonthlyCalendar({ logs, habitType, onDayClick, selectedDate, helperText }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const logMap = new Map<string, HabitLog>();
  for (const log of logs) {
    logMap.set(log.date, log);
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="card calendar-card" style={{ marginTop: 24 }}>
      <div className="calendar-shell">
        <div className="calendar-header">
          <button className="btn btn-ghost" onClick={prevMonth} type="button">
            <ChevronLeft size={18} />
          </button>
          <h3>
            {MONTH_NAMES[month]} {year}
          </h3>
          <button className="btn btn-ghost" onClick={nextMonth} type="button">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="calendar-meta">
          <p className="calendar-helper">{helperText ?? "Select a day to add or update a log."}</p>
          {selectedDate && <div className="calendar-selected">Selected: {formatSelectedDate(selectedDate)}</div>}
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null)
              return <div key={`e-${idx}`} className="calendar-day empty" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const log = logMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            let className = "calendar-day";
            let scoreInfo: { label: string; level: string } | null = null;

            if (log) {
              scoreInfo = getLogDisplay(log, habitType);
              className += ` logged ${scoreInfo.level}`;
            }
            if (isToday) className += " today";
            if (dateStr > todayStr) className += " future";
            if (isSelected) className += " selected";

            return (
              <button
                key={dateStr}
                type="button"
                className={className}
                onClick={() => onDayClick?.(dateStr)}
                disabled={!onDayClick}
              >
                <div className="day-number">{day}</div>
                {scoreInfo && <div className="day-score">{scoreInfo.label}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
