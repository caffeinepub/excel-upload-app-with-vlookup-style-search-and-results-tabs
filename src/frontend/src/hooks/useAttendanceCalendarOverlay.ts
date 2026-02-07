import { useMemo } from 'react';
import { useActor } from './useActor';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceDayEntry, AttendanceStatus } from '../backend';
import type { CalendarEvent } from './useCalendarEvents';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  leave: 'Leave',
  halfDay: 'Half Day',
  weeklyOff: 'Weekly Off',
  festival: 'Festival',
  companyLeave: 'Company Leave',
};

/**
 * Hook to fetch all attendance entries and map them to calendar events
 */
export function useAttendanceCalendarOverlay() {
  const { actor, isFetching } = useActor();

  const query = useQuery<Array<[string, AttendanceDayEntry]>>({
    queryKey: ['allAttendanceEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAttendanceEntries();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });

  // Map attendance entries to calendar events
  const attendanceEvents = useMemo<CalendarEvent[]>(() => {
    if (!query.data) return [];

    return query.data.map(([date, entry]) => {
      // Parse date string (YYYY-MM-DD) to timestamp
      const dateObj = new Date(date + 'T00:00:00');
      const startTime = BigInt(dateObj.getTime());

      // Format working time
      const hours = Math.floor(Number(entry.workingTime) / 3600);
      const minutes = Math.floor((Number(entry.workingTime) % 3600) / 60);
      const workingTimeStr = hours > 0 || minutes > 0 ? ` (${hours}h ${minutes}m)` : '';

      // Build title
      const statusLabel = STATUS_LABELS[entry.status] || entry.status;
      const title = `${statusLabel}${workingTimeStr}`;

      // Build description
      let description = `Status: ${statusLabel}`;
      if (entry.note) {
        description += `\n\nWork Note: ${entry.note}`;
      }
      if (entry.checkIn) {
        const checkInDate = new Date(Number(entry.checkIn) / 1_000_000);
        description += `\n\nCheck-in: ${checkInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (entry.checkOut) {
        const checkOutDate = new Date(Number(entry.checkOut) / 1_000_000);
        description += `\nCheck-out: ${checkOutDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }

      return {
        id: BigInt(date.replace(/-/g, '')), // Use date as unique ID (e.g., 20260207)
        title,
        description,
        startTime,
        endTime: undefined,
        location: undefined,
        participants: [],
        source: 'attendance' as const,
        isDeletable: false,
      };
    });
  }, [query.data]);

  return {
    ...query,
    data: attendanceEvents,
  };
}
