import type { AttendanceConfig } from '../../backend';

/**
 * Convert hours and minutes to total seconds
 */
export function hoursMinutesToSeconds(hours: number, minutes: number): bigint {
  return BigInt((hours * 3600) + (minutes * 60));
}

/**
 * Convert seconds to hours and minutes
 */
export function secondsToHoursMinutes(seconds: bigint): { hours: number; minutes: number } {
  const totalSeconds = Number(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
}

/**
 * Validate attendance config inputs
 */
export function validateAttendanceConfig(
  regularHours: string,
  regularMinutes: string,
  weeklyOffDays: number[],
  leavePolicy: string
): { valid: boolean; error?: string } {
  // Validate regular working time
  const hours = parseInt(regularHours, 10);
  const minutes = parseInt(regularMinutes, 10);
  
  if (isNaN(hours) || hours < 0 || hours > 24) {
    return { valid: false, error: 'Working hours must be between 0 and 24' };
  }
  
  if (isNaN(minutes) || minutes < 0 || minutes >= 60) {
    return { valid: false, error: 'Working minutes must be between 0 and 59' };
  }
  
  // Validate weekly off days
  if (weeklyOffDays.length === 0) {
    return { valid: false, error: 'Please select at least one weekly off day' };
  }
  
  // Validate leave policy
  const leaveDays = parseInt(leavePolicy, 10);
  if (isNaN(leaveDays) || leaveDays < 0 || leaveDays > 365) {
    return { valid: false, error: 'Leave policy must be between 0 and 365 days' };
  }
  
  return { valid: true };
}

/**
 * Create an AttendanceConfig object from form inputs
 */
export function createAttendanceConfig(
  regularHours: string,
  regularMinutes: string,
  weeklyOffDays: number[],
  leavePolicy: string
): AttendanceConfig {
  const hours = parseInt(regularHours, 10);
  const minutes = parseInt(regularMinutes, 10);
  const leaveDays = parseInt(leavePolicy, 10);
  
  return {
    regularWorkingTime: hoursMinutesToSeconds(hours, minutes),
    weeklyOffDays: weeklyOffDays.map(d => BigInt(d)),
    leavePolicy: BigInt(leaveDays),
  };
}
