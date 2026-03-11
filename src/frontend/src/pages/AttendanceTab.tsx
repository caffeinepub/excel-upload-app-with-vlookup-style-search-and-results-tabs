import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  History,
  Palmtree,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { AttendanceDayEntry } from "../backend";
import { AttendanceDateEditor } from "../components/attendance/AttendanceDateEditor";
import AttendanceHistoryView from "../components/attendance/AttendanceHistoryView";
import { AttendanceMonthCalendar } from "../components/attendance/AttendanceMonthCalendar";
import { HolidayManager } from "../components/attendance/HolidayManager";
import LeaveCardTab from "../components/attendance/LeaveCardTab";
import TodayAttendanceView from "../components/attendance/TodayAttendanceView";
import { useActor } from "../hooks/useActor";
import { useApproval } from "../hooks/useApproval";
import {
  useEditAttendanceEntry,
  useGetAttendanceEntries,
  useGetAttendanceEntry,
  useHasCustomDatePermission,
} from "../hooks/useAttendance";
import { useGetHolidays } from "../hooks/useHolidays";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useUserProfile";

export default function AttendanceTab() {
  const { identity } = useInternetIdentity();
  const { isAdmin } = useApproval();
  const { data: hasCustomDatePerm = false } = useHasCustomDatePermission();
  const { actor } = useActor();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayBlockDate, setHolidayBlockDate] = useState<string | null>(null);

  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const userPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: holidays = [] } = useGetHolidays();
  const { data: attendanceEntriesRaw = [] } = useGetAttendanceEntries();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: selectedDateEntry = null } = useGetAttendanceEntry(
    selectedDate ?? "",
  );
  const editEntry = useEditAttendanceEntry();

  const attendanceEntriesMap = new Map<string, AttendanceDayEntry>(
    attendanceEntriesRaw.map(([date, entry]) => [date, entry]),
  );

  const userDepartmentId = userProfile?.departmentId ?? null;

  const handleMonthChange = (year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonth(month);
  };

  // Check if a date is a holiday
  const checkIsHoliday = async (dateStr: string): Promise<boolean> => {
    if (!actor) return false;
    try {
      return await actor.isHolidayDate(dateStr);
    } catch {
      // Fallback: check local holidays list
      return holidays.some((h) => {
        const hDate = new Date(Number(h.date)).toISOString().slice(0, 10);
        return hDate === dateStr;
      });
    }
  };

  const handleDateSelect = async (date: string) => {
    // Non-admin users: check if date is a holiday
    if (!isAdmin) {
      const isHoliday = await checkIsHoliday(date);
      if (isHoliday) {
        setHolidayBlockDate(date);
        setSelectedDate(null);
        return;
      }
    }
    setHolidayBlockDate(null);
    setSelectedDate(date);
  };

  const handleSaveAttendanceEntry = async (entry: AttendanceDayEntry) => {
    if (!selectedDate) return;
    try {
      await editEntry.mutateAsync({ date: selectedDate, entry });
      toast.success("Attendance saved successfully!");
      setSelectedDate(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save attendance";
      toast.error(message);
      throw error;
    }
  };

  // Determine if user can edit selected date
  const canEditSelectedDate = isAdmin || hasCustomDatePerm;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Attendance</h2>
        <p className="text-sm text-muted-foreground">
          Track your daily attendance and work hours
        </p>
      </div>

      {holidayBlockDate && (
        <Alert variant="destructive" data-ocid="attendance.holiday-block">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{holidayBlockDate}</strong> is a holiday — attendance
            editing is not allowed on this date.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="today">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger
            value="today"
            className="gap-1"
            data-ocid="attendance.today.tab"
          >
            <Clock className="h-3 w-3" />
            Today
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="gap-1"
            data-ocid="attendance.calendar.tab"
          >
            <Calendar className="h-3 w-3" />
            Calendar
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-1"
            data-ocid="attendance.history.tab"
          >
            <History className="h-3 w-3" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="leave"
            className="gap-1"
            data-ocid="attendance.leave.tab"
          >
            <FileText className="h-3 w-3" />
            Leave Card
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="holidays"
              className="gap-1"
              data-ocid="attendance.holidays.tab"
            >
              <Palmtree className="h-3 w-3" />
              Holidays
            </TabsTrigger>
          )}
        </TabsList>

        {/* Today */}
        <TabsContent value="today" className="mt-4">
          <TodayAttendanceView userPrincipal={userPrincipal} />
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <AttendanceMonthCalendar
            year={calendarYear}
            month={calendarMonth}
            attendanceEntries={attendanceEntriesMap}
            holidays={holidays}
            onMonthChange={handleMonthChange}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            userDepartmentId={userDepartmentId}
          />
          {selectedDate && (
            <div className="mt-4">
              <AttendanceDateEditor
                date={selectedDate}
                entry={selectedDateEntry}
                onSave={handleSaveAttendanceEntry}
                isSaving={editEntry.isPending}
                canEditSelectedDate={canEditSelectedDate}
                permissionMessage={
                  !canEditSelectedDate
                    ? "You don't have permission to edit this date."
                    : undefined
                }
              />
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <AttendanceHistoryView />
        </TabsContent>

        {/* Leave Card */}
        <TabsContent value="leave" className="mt-4">
          <LeaveCardTab />
        </TabsContent>

        {/* Holidays (admin only) */}
        {isAdmin && (
          <TabsContent value="holidays" className="mt-4">
            <HolidayManager
              holidays={holidays}
              currentMonth={calendarMonth}
              currentYear={calendarYear}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
