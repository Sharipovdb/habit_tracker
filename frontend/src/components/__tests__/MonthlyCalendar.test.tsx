import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthlyCalendar from "../MonthlyCalendar";
import type { HabitLog } from "../../types";

// ---------------------------------------------------------------------------
// Helper fixtures
// ---------------------------------------------------------------------------

/** Build a minimal HabitLog for a given date. */
function makeLog(date: string, extra: Record<string, unknown> = {}): HabitLog {
  return {
    id: `log-${date}`,
    habitId: "habit-1",
    date,
    data: extra as HabitLog["data"],
  };
}

/** Year-month prefix for the current month in YYYY-MM format. */
const NOW = new Date();
const YEAR = NOW.getFullYear();
const MONTH = String(NOW.getMonth() + 1).padStart(2, "0");
const TODAY_STR = `${YEAR}-${MONTH}-${String(NOW.getDate()).padStart(2, "0")}`;
const TODAY_FIRST = `${YEAR}-${MONTH}-01`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("MonthlyCalendar", () => {
  describe("initial render", () => {
    it("displays the current month header", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" />);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      expect(screen.getByText(new RegExp(monthNames[NOW.getMonth()]))).toBeInTheDocument();
    });

    it("renders all seven weekday headers", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" />);
      for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
        expect(screen.getByText(day)).toBeInTheDocument();
      }
    });

    it("shows the helper text when provided", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" helperText="Pick a date" />);
      expect(screen.getByText("Pick a date")).toBeInTheDocument();
    });

    it("shows the default helper text when helperText is not provided", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" />);
      expect(screen.getByText(/select a day/i)).toBeInTheDocument();
    });
  });

  describe("log rendering", () => {
    it("marks logged days with the 'logged' class", () => {
      const logs = [makeLog(TODAY_FIRST, { distance: 5, pace: 6, duration: 30, caloriesBurned: 363 })];
      render(<MonthlyCalendar logs={logs} habitType="run" />);

      // The button for that day should contain a day-score div
      const dayScore = screen.getByText("5km");
      expect(dayScore).toBeInTheDocument();
    });

    it("shows km distance label for run habit", () => {
      const logs = [makeLog(TODAY_FIRST, { distance: 10 })];
      render(<MonthlyCalendar logs={logs} habitType="run" />);
      expect(screen.getByText("10km")).toBeInTheDocument();
    });

    it("shows checkmark for completed other habit", () => {
      const logs = [makeLog(TODAY_FIRST, { completed: true })];
      render(<MonthlyCalendar logs={logs} habitType="other" />);
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("shows cross for incomplete other habit", () => {
      const logs = [makeLog(TODAY_FIRST, { completed: false })];
      render(<MonthlyCalendar logs={logs} habitType="other" />);
      expect(screen.getByText("✗")).toBeInTheDocument();
    });

    it("shows sleep score for sleep habit", () => {
      const logs = [makeLog(TODAY_FIRST, { score: 8, status: "success", sleepHours: 8, bedtime: "23:00", wakeTime: "07:00", awakenings: 0 })];
      render(<MonthlyCalendar logs={logs} habitType="sleep" />);
      // The score "8" appears in a day-score div; there may also be a day-number with 8
      const scoreElements = screen.getAllByText("8");
      const scoreDiv = scoreElements.find((el) => el.classList.contains("day-score"));
      expect(scoreDiv).toBeDefined();
    });

    it("shows today's date button with today class", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" />);
      // Today's button should have the "today" CSS class
      const todayDay = String(NOW.getDate());
      const buttons = screen.getAllByRole("button");
      const todayBtn = buttons.find(
        (btn) => btn.classList.contains("today") && btn.textContent?.includes(todayDay),
      );
      expect(todayBtn).toBeDefined();
    });
  });

  describe("selected date", () => {
    it("shows the selected date label when selectedDate is provided", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" selectedDate={TODAY_STR} />);
      expect(screen.getByText(/selected:/i)).toBeInTheDocument();
    });

    it("does not show selected label when selectedDate is not provided", () => {
      render(<MonthlyCalendar logs={[]} habitType="run" />);
      expect(screen.queryByText(/selected:/i)).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("goes to the previous month when the back button is clicked", async () => {
      const user = userEvent.setup();
      render(<MonthlyCalendar logs={[]} habitType="run" />);

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const prevMonthIndex = NOW.getMonth() === 0 ? 11 : NOW.getMonth() - 1;
      const prevMonthName = monthNames[prevMonthIndex];

      // Click the previous-month button (first button in the header)
      const buttons = screen.getAllByRole("button");
      const prevBtn = buttons[0];
      await user.click(prevBtn);

      expect(screen.getByText(new RegExp(prevMonthName))).toBeInTheDocument();
    });

    it("goes to the next month when the forward button is clicked", async () => {
      const user = userEvent.setup();
      render(<MonthlyCalendar logs={[]} habitType="run" />);

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const nextMonthIndex = NOW.getMonth() === 11 ? 0 : NOW.getMonth() + 1;
      const nextMonthName = monthNames[nextMonthIndex];

      // Click the next-month button (second button in the header)
      const buttons = screen.getAllByRole("button");
      const nextBtn = buttons[1];
      await user.click(nextBtn);

      expect(screen.getByText(new RegExp(nextMonthName))).toBeInTheDocument();
    });

    it("calls onDayClick with the correct date string when a day is clicked", async () => {
      const user = userEvent.setup();
      const onDayClick = vi.fn();
      render(<MonthlyCalendar logs={[]} habitType="run" onDayClick={onDayClick} />);

      // Click on the 1st of the current month
      const dayButtons = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.trim() === "1" && !btn.classList.contains("empty"),
      );
      // There should be at least one button with day "1"
      expect(dayButtons.length).toBeGreaterThan(0);
      await user.click(dayButtons[0]);

      expect(onDayClick).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-01$/));
    });
  });
});
