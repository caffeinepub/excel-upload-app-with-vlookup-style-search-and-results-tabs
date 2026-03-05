import { type AttendanceDayEntry, AttendanceStatus } from "../../backend";
import type { ExportData } from "../export/exportPdf";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.present]: "Present",
  [AttendanceStatus.leave]: "Leave",
  [AttendanceStatus.halfDay]: "Half Day",
  [AttendanceStatus.weeklyOff]: "Week Off",
  [AttendanceStatus.festival]: "Festival Leave",
  [AttendanceStatus.companyLeave]: "Company Leave",
  [AttendanceStatus.holiday]: "Holiday",
};

function formatNsTime(ns: bigint | undefined): string {
  if (!ns) return "--";
  const ms = Number(ns) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkingTime(seconds: bigint): string {
  const totalMinutes = Number(seconds) / 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours === 0 && minutes === 0) return "0h 0m";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function buildPersonalRows(
  entries: [string, AttendanceDayEntry][],
): (string | number | boolean | null)[][] {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([date, entry]) => {
    const checkIn = formatNsTime(entry.checkIn);
    const checkOut = entry.checkOut
      ? formatNsTime(entry.checkOut)
      : "Not checked out";
    const workingTime =
      entry.workingTime > BigInt(0)
        ? formatWorkingTime(entry.workingTime)
        : "--";
    const status = STATUS_LABELS[entry.status] ?? entry.status;
    const note = entry.note?.trim() || "--";

    return [date, status, checkIn, checkOut, workingTime, note];
  });
}

function buildAdminRows(
  entries: [
    string,
    AttendanceDayEntry & { employeeName?: string; employeePrincipal?: string },
  ][],
): (string | number | boolean | null)[][] {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([date, entry]) => {
    const checkIn = formatNsTime(entry.checkIn);
    const checkOut = entry.checkOut
      ? formatNsTime(entry.checkOut)
      : "Not checked out";
    const workingTime =
      entry.workingTime > BigInt(0)
        ? formatWorkingTime(entry.workingTime)
        : "--";
    const status = STATUS_LABELS[entry.status] ?? entry.status;
    const note = entry.note?.trim() || "--";
    const empName =
      entry.employeeName ||
      (entry.employeePrincipal
        ? `${entry.employeePrincipal.slice(0, 14)}...`
        : "--");

    return [date, empName, status, checkIn, checkOut, workingTime, note];
  });
}

function countByStatus(
  entries: [string, AttendanceDayEntry][],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [, entry] of entries) {
    const label = STATUS_LABELS[entry.status] ?? entry.status;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

function totalWorkingTimeSeconds(
  entries: [string, AttendanceDayEntry][],
): bigint {
  return entries.reduce((sum, [, e]) => sum + e.workingTime, BigInt(0));
}

/**
 * Map attendance entries to ExportData for personal (non-admin) PDF export.
 * Includes attendance status (Present/Leave/Festival Leave/Company Leave/Week Off etc.)
 */
export function mapAttendanceDayEntriesToPdfData(
  entries: [string, AttendanceDayEntry][],
  title: string,
  rangeLabel: string,
): ExportData {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b));
  const counts = countByStatus(sorted);
  const totalWorked = totalWorkingTimeSeconds(sorted);

  // Summary rows
  const summaryRows: (string | number | boolean | null)[][] = [
    ["Report Title", title, "", "", "", ""],
    ["Period", rangeLabel, "", "", "", ""],
    ["Total Records", String(sorted.length), "", "", "", ""],
    ["Total Working Time", formatWorkingTime(totalWorked), "", "", "", ""],
    ...Object.entries(counts).map(([status, count]) => [
      status,
      String(count),
      "",
      "",
      "",
      "",
    ]),
    ["", "", "", "", "", ""],
  ];

  return {
    headers: [
      "Date",
      "Status",
      "Check In",
      "Check Out",
      "Working Time",
      "Work Details",
    ],
    rows: [...summaryRows, ...buildPersonalRows(sorted)],
  };
}

/**
 * Map attendance entries to ExportData for admin (all-employees) PDF export.
 */
export function mapAttendanceDayEntriesToPdfDataFull(
  entries: [
    string,
    AttendanceDayEntry & { employeeName?: string; employeePrincipal?: string },
  ][],
  title: string,
  rangeLabel: string,
): ExportData {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b));
  const counts = countByStatus(sorted);
  const totalWorked = totalWorkingTimeSeconds(sorted);

  const summaryRows: (string | number | boolean | null)[][] = [
    ["Report Title", title, "", "", "", "", ""],
    ["Period", rangeLabel, "", "", "", "", ""],
    ["Total Records", String(sorted.length), "", "", "", "", ""],
    ["Total Working Time", formatWorkingTime(totalWorked), "", "", "", "", ""],
    ...Object.entries(counts).map(([status, count]) => [
      status,
      String(count),
      "",
      "",
      "",
      "",
      "",
    ]),
    ["", "", "", "", "", "", ""],
  ];

  return {
    headers: [
      "Date",
      "Employee",
      "Status",
      "Check In",
      "Check Out",
      "Working Time",
      "Work Details",
    ],
    rows: [...summaryRows, ...buildAdminRows(sorted)],
  };
}

// Keep old functions for backward compatibility (used in old AttendancePdfExportSection)
export function mapAttendanceRecordsToPdfData(
  _records: unknown[],
  title: string,
  rangeLabel: string,
): ExportData {
  return {
    headers: [
      "Date",
      "Status",
      "Check In",
      "Check Out",
      "Working Time",
      "Work Details",
    ],
    rows: [
      ["Report Title", title, "", "", "", ""],
      ["Period", rangeLabel, "", "", "", ""],
      ["No data available", "", "", "", "", ""],
    ],
  };
}

export function mapAttendanceRecordsToPdfDataFull(
  _records: unknown[],
  title: string,
  rangeLabel: string,
): ExportData {
  return {
    headers: [
      "Date",
      "Employee",
      "Status",
      "Check In",
      "Check Out",
      "Working Time",
      "Work Details",
    ],
    rows: [
      ["Report Title", title, "", "", "", "", ""],
      ["Period", rangeLabel, "", "", "", "", ""],
      ["No data available", "", "", "", "", "", ""],
    ],
  };
}
