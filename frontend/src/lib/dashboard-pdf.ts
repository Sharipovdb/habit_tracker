import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardStats, HabitType } from "../types";

type AutoTableDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const TYPE_LABELS: Record<HabitType, string> = {
  run: "Running",
  diet: "Diet",
  sleep: "Sleep",
  other: "Other",
};

function getMonthLabel(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getFileMonthLabel(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  }).replace(/\s+/g, "-").toLowerCase();
}

function getActiveTypesCount(habitsByType: DashboardStats["habitsByType"]): number {
  return Object.values(habitsByType).filter((count) => count > 0).length;
}

function getTopHabit(stats: DashboardStats): string {
  const topHabit = stats.month.completedByHabit.find((habit) => habit.completedDays > 0);

  if (!topHabit) {
    return "No completed habits this month";
  }

  return `${topHabit.habitTitle} (${topHabit.completedDays} days)`;
}

export function exportDashboardMonthlyPdf(stats: DashboardStats): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pdfDoc = doc as AutoTableDoc;
  const monthLabel = getMonthLabel();
  const reportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  doc.setFillColor(34, 61, 143);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Monthly Habit Dashboard", 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${monthLabel} report`, 40, 70);
  doc.text(`Generated on ${reportDate}`, 40, 88);

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Monthly Overview", 40, 145);

  autoTable(doc, {
    startY: 160,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 11,
      textColor: [31, 41, 55],
      cellPadding: 10,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [79, 110, 247],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    body: [
      ["Total habits", String(stats.totalHabits)],
      ["Month completions", String(stats.month.completedDays)],
      ["Active habit types", String(getActiveTypesCount(stats.habitsByType))],
      ["Top habit", getTopHabit(stats)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 170 },
      1: { cellWidth: 320 },
    },
  });

  const overviewTable = pdfDoc.lastAutoTable;
  const typesStartY = (overviewTable?.finalY ?? 160) + 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Habits by Type", 40, typesStartY);

  autoTable(doc, {
    startY: typesStartY + 14,
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: [31, 41, 55],
      cellPadding: 8,
    },
    head: [["Type", "Habits"]],
    body: Object.entries(stats.habitsByType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => [TYPE_LABELS[type as HabitType], String(count)]),
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
  });

  const typesTable = pdfDoc.lastAutoTable;
  const habitsStartY = (typesTable?.finalY ?? typesStartY + 14) + 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${monthLabel} Completion by Habit`, 40, habitsStartY);

  autoTable(doc, {
    startY: habitsStartY + 14,
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: [31, 41, 55],
      cellPadding: 8,
      overflow: "linebreak",
    },
    head: [["Habit", "Type", "Completed days"]],
    body: stats.month.completedByHabit.map((habit) => [
      habit.habitTitle,
      TYPE_LABELS[habit.habitType],
      String(habit.completedDays),
    ]),
    headStyles: {
      fillColor: [245, 158, 11],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 280 },
      1: { cellWidth: 120 },
      2: { halign: "right", cellWidth: 100 },
    },
  });

  doc.save(`habit-dashboard-${getFileMonthLabel()}.pdf`);
}