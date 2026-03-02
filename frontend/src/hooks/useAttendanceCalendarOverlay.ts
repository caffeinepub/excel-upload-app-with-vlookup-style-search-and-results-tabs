import { useMemo } from 'react';
import { useActor } from './useActor';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceDayEntry, AttendanceStatus } from '../backend';

// Local interface for attendance-derived calendar events
export interface AttendanceCalendarEvent {
  id: bigint;
  title: string;
  description: string;
  startTime: bigint;
  source: 'attendance';
  isDeletable: boolean;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  leave: 'Leave',
  halfDay: 'Half Day',
  weeklyOff: 'Weekly Off',
  festival: 'Festival',
  companyLeave: 'Company Leave',
};

export function useAttendanceCalendarOverlay() {
  const { actor, isFetching } = useActor();

  const query = useQuery<Array<[string, AttendanceDayEntry]>>({
    queryKey: ['allAttendanceEntries'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAttendanceEntries();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });

  const attendanceEvents = useMemo<AttendanceCalendarEvent[]>(() => {
    if (!query.data) return [];

    return query.data.map(([date, entry]) => {
      const dateObj = new Date(date + 'T00:00:00');
      const startTime = BigInt(dateObj.getTime());

      const hours = Math.floor(Number(entry.workingTime) / 3600);
      const minutes = Math.floor((Number(entry.workingTime) % 3600) / 60);
      const workingTimeStr = hours > 0 || minutes > 0 ? ` (${hours}h ${minutes}m)` : '';

      const statusLabel = STATUS_LABELS[entry.status] || entry.status;
      const title = `${statusLabel}${workingTimeStr}`;

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
        id: BigInt(date.replace(/-/g, '')),
        title,
        description,
        startTime,
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
