/**
 * Format a date as YYYY-MM-DD for backend calls
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the start and end dates for the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): [string, string] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return [formatDateForBackend(monday), formatDateForBackend(sunday)];
}

/**
 * Get the start and end dates for the current month
 */
export function getCurrentMonthRange(): [string, string] {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return [formatDateForBackend(firstDay), formatDateForBackend(lastDay)];
}

/**
 * Get the start and end dates for the current year
 */
export function getCurrentYearRange(): [string, string] {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const lastDay = new Date(now.getFullYear(), 11, 31);
  
  return [formatDateForBackend(firstDay), formatDateForBackend(lastDay)];
}

/**
 * Format seconds into a human-readable duration (e.g., "8h 30m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Format a timestamp (nanoseconds) to a readable time string
 */
export function formatTime(timestamp: bigint): string {
  const milliseconds = Number(timestamp) / 1_000_000;
  const date = new Date(milliseconds);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
