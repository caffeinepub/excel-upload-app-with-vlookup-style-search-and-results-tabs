import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AttendanceDayEntry, AttendanceStatus, Holiday } from "../backend";
import { useActor } from "./useActor";
import { useGetHolidays } from "./useHolidays";
import { useGetCallerUserProfile } from "./useUserProfile";

// Local interface for attendance-derived calendar events
export interface AttendanceCalendarEvent {
  id: bigint;
  title: string;
  description: string;
  startTime: bigint;
  source: "attendance" | "holiday";
  isDeletable: boolean;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  leave: "Leave",
  halfDay: "Half Day",
  weeklyOff: "Weekly Off",
  festival: "Festival",
  companyLeave: "Company Leave",
  holiday: "Holiday",
};

function timestampToDateString(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isHolidayApplicable(
  holiday: Holiday,
  userDepartmentId?: bigint | null,
): boolean {
  if (holiday.applicableDepartments.length === 0) return true;
  if (userDepartmentId == null) return false;
  return holiday.applicableDepartments.some((id) => id === userDepartmentId);
}

export function useAttendanceCalendarOverlay() {
  const { actor, isFetching } = useActor();

  const attendanceQuery = useQuery<Array<[string, AttendanceDayEntry]>>({
    queryKey: ["allAttendanceEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAttendanceEntries();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });

  const { data: holidays = [] } = useGetHolidays();
  const { data: userProfile } = useGetCallerUserProfile();
  const userDepartmentId = userProfile?.departmentId ?? null;

  const allEvents = useMemo<AttendanceCalendarEvent[]>(() => {
    const events: AttendanceCalendarEvent[] = [];

    // Attendance events
    if (attendanceQuery.data) {
      for (const [date, entry] of attendanceQuery.data) {
        const dateObj = new Date(`${date}T00:00:00`);
        const startTime = BigInt(dateObj.getTime());

        const hours = Math.floor(Number(entry.workingTime) / 3600);
        const minutes = Math.floor((Number(entry.workingTime) % 3600) / 60);
        const workingTimeStr =
          hours > 0 || minutes > 0 ? ` (${hours}h ${minutes}m)` : "";

        const statusLabel = STATUS_LABELS[entry.status] || entry.status;
        const title = `${statusLabel}${workingTimeStr}`;

        let description = `Status: ${statusLabel}`;
        if (entry.note) {
          description += `\n\nWork Note: ${entry.note}`;
        }
        if (entry.checkIn) {
          const checkInDate = new Date(Number(entry.checkIn) / 1_000_000);
          description += `\n\nCheck-in: ${checkInDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        }
        if (entry.checkOut) {
          const checkOutDate = new Date(Number(entry.checkOut) / 1_000_000);
          description += `\nCheck-out: ${checkOutDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        }

        events.push({
          id: BigInt(date.replace(/-/g, "")),
          title,
          description,
          startTime,
          source: "attendance" as const,
          isDeletable: false,
        });
      }
    }

    // Holiday events — only applicable to user's department
    for (const holiday of holidays) {
      if (!isHolidayApplicable(holiday, userDepartmentId)) continue;

      const dateStr = timestampToDateString(holiday.date);
      const dateObj = new Date(`${dateStr}T00:00:00`);
      const startTime = BigInt(dateObj.getTime());

      const title = `🎉 Holiday: ${holiday.name}`;
      const descParts = [`Type: ${holiday.holidayType}`];
      if (holiday.description) descParts.push(holiday.description);
      const description = descParts.join("\n");

      events.push({
        id: BigInt(`9${String(holiday.id)}`),
        title,
        description,
        startTime,
        source: "holiday" as const,
        isDeletable: false,
      });
    }

    return events;
  }, [attendanceQuery.data, holidays, userDepartmentId]);

  return {
    ...attendanceQuery,
    data: allEvents,
  };
}
