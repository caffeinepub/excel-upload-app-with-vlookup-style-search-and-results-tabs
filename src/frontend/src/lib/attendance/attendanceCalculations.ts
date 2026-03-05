import type { BreakPeriod, Shift } from "../../backend";

/** Convert nanosecond bigint timestamp to milliseconds number */
export function nsToMs(ns: bigint): number {
  return Number(ns / 1_000_000n);
}

/** Format a nanosecond timestamp to HH:MM:SS */
export function formatNsTime(ns: bigint): string {
  const date = new Date(nsToMs(ns));
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Format a nanosecond timestamp to HH:MM */
export function formatNsTimeShort(ns: bigint): string {
  const date = new Date(nsToMs(ns));
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Calculate duration in milliseconds between two ns timestamps */
export function durationMs(start: bigint, end: bigint): number {
  return nsToMs(end - start);
}

/** Format milliseconds to "Xh Ym" string */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Calculate total worked milliseconds from completed shifts */
export function calcTotalWorkedMs(shifts: Shift[]): number {
  return shifts.reduce((acc, shift) => {
    if (shift.clockOut != null) {
      return acc + durationMs(shift.clockIn, shift.clockOut);
    }
    return acc;
  }, 0);
}

/** Calculate total break milliseconds from completed break periods */
export function calcTotalBreakMs(breaks: BreakPeriod[]): number {
  return breaks.reduce((acc, b) => acc + durationMs(b.start, b.end), 0);
}

/** Check if there is an open (clocked-in but not clocked-out) shift */
export function hasOpenShift(shifts: Shift[]): boolean {
  return shifts.some((s) => s.clockOut == null);
}

/** Get the currently open shift, if any */
export function getOpenShift(shifts: Shift[]): Shift | null {
  return shifts.find((s) => s.clockOut == null) ?? null;
}

/** Get today's date string in YYYY-MM-DD format */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get current time as nanosecond bigint */
export function nowNs(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}
