/** Get YYYY-MM-DD string from a Date */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get start (Monday) and end (Sunday) of a week given a date within that week */
export function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}

/** Get start and end of a month given year and month (1-based) */
export function getMonthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toDateString(start), end: toDateString(end) };
}

/** Generate list of past N weeks (including current) as { label, start, end } */
export function getPastWeeks(
  count: number,
): { label: string; start: string; end: string }[] {
  const result: { label: string; start: string; end: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const range = getWeekRange(d);
    const label =
      i === 0 ? `This Week (${range.start})` : `Week of ${range.start}`;
    result.push({ label, ...range });
  }
  return result;
}

/** Generate list of past N months (including current) as { label, start, end } */
export function getPastMonths(
  count: number,
): { label: string; start: string; end: string }[] {
  const result: { label: string; start: string; end: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const range = getMonthRange(year, month);
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    result.push({ label, ...range });
  }
  return result;
}

/** Filter records by date range (inclusive) */
export function filterRecordsByDateRange(
  records: [string, unknown][],
  start: string,
  end: string,
): [string, unknown][] {
  return records.filter(([date]) => date >= start && date <= end);
}

/** Format seconds to "Xh Ym" */
export function formatDurationSeconds(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format a bigint nanosecond timestamp to a readable date string */
export function formatNsDate(ns: bigint): string {
  return new Date(Number(ns / 1_000_000n)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
