import type { AttendanceSummary, AttendanceDayEntry, AttendanceStatus } from '../../backend';
import { formatDuration } from './dateRanges';

export interface ExportData {
  title: string;
  headers: string[];
  rows: string[][];
}

/**
 * Get day of week name from date string (YYYY-MM-DD)
 */
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Format attendance status for display
 */
function formatStatus(status: AttendanceStatus): string {
  const statusMap: Record<string, string> = {
    present: 'Present',
    leave: 'Leave',
    halfDay: 'Half Day',
    festival: 'Festival',
    companyLeave: 'Company Leave',
    weeklyOff: 'Weekly Off',
  };
  return statusMap[status] || status;
}

/**
 * Format time from nanoseconds timestamp
 */
function formatTimeFromNano(timestamp: bigint | undefined): string {
  if (!timestamp) return '-';
  const milliseconds = Number(timestamp) / 1_000_000;
  const date = new Date(milliseconds);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Map attendance summary to PDF export data with detailed report style
 */
export function mapAttendanceSummaryToExportData(
  summary: AttendanceSummary,
  rangeType: 'week' | 'month' | 'year',
  startDate: string,
  endDate: string
): ExportData {
  const title = `Attendance Report - ${rangeType.charAt(0).toUpperCase() + rangeType.slice(1)}`;
  
  // Build summary section
  const summaryRows: string[][] = [
    ['ATTENDANCE SUMMARY', '', '', '', '', ''],
    ['Period', `${startDate} to ${endDate}`, '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Total Days', String(summary.totalDays), 'Present Days', String(summary.presentDays), '', ''],
    ['Leave Days', String(summary.leaveDays), 'Half Days', String(summary.halfDays), '', ''],
    ['Festival Days', String(summary.festivalDays), 'Company Leave', String(summary.companyLeaveDays), '', ''],
    ['Weekly Off Days', String(summary.weeklyOffDays), 'Total Working Time', formatDuration(Number(summary.totalWorkingTime)), '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
  ];

  // Build breakdown section header
  const breakdownHeader: string[][] = [
    ['DAILY BREAKDOWN', '', '', '', '', ''],
  ];

  // Build breakdown rows
  const breakdownRows: string[][] = summary.breakdown.map(([date, entry]) => {
    return [
      date,
      getDayOfWeek(date),
      formatStatus(entry.status),
      formatTimeFromNano(entry.checkIn),
      formatTimeFromNano(entry.checkOut),
      entry.workingTime > BigInt(0) ? formatDuration(Number(entry.workingTime)) : '-',
    ];
  });

  // Combine all rows
  const allRows = [
    ...summaryRows,
    ...breakdownHeader,
    ['Date', 'Day', 'Status', 'Check-in', 'Check-out', 'Working Time'],
    ...breakdownRows,
  ];

  return {
    title,
    headers: ['Date', 'Day', 'Status', 'Check-in', 'Check-out', 'Working Time'],
    rows: allRows,
  };
}

/**
 * Generate filename for attendance PDF export
 */
export function generateAttendanceFilename(rangeType: 'week' | 'month' | 'year', startDate: string, endDate: string): string {
  const rangeLabel = rangeType.charAt(0).toUpperCase() + rangeType.slice(1);
  const dateLabel = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
  return `Attendance_${rangeLabel}_${dateLabel}.pdf`;
}
