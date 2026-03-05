import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, FileText, History, Palmtree } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { AttendanceDayEntry } from "../backend";
import { AttendanceDateEditor } from "../components/attendance/AttendanceDateEditor";
import AttendanceHistoryView from "../components/attendance/AttendanceHistoryView";
import { AttendanceMonthCalendar } from "../components/attendance/AttendanceMonthCalendar";
import { HolidayManager } from "../components/attendance/HolidayManager";
import LeaveCardTab from "../components/attendance/LeaveCardTab";
import TodayAttendanceView from "../components/attendance/TodayAttendanceView";
import { useApproval } from "../hooks/useApproval";
import {
  useEditAttendanceEntry,
  useGetAttendanceEntries,
  useGetAttendanceEntry,
} from "../hooks/useAttendance";
import { useGetHolidays } from "../hooks/useHolidays";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useUserProfile";

export default function AttendanceTab() {
  const { identity } = useInternetIdentity();
  const { isAdmin } = useApproval();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const userPrincipal = identity?.getPrincipal().toString() ?? "";

  // Fetch holidays, attendance entries, and user profile
  const { data: holidays = [] } = useGetHolidays();
  const { data: attendanceEntriesRaw = [] } = useGetAttendanceEntries();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: selectedDateEntry = null } = useGetAttendanceEntry(
    selectedDate ?? "",
  );
  const editEntry = useEditAttendanceEntry();

  // Build attendance entries map for calendar
  const attendanceEntriesMap = new Map<string, AttendanceDayEntry>(
    attendanceEntriesRaw.map(([date, entry]) => [date, entry]),
  );

  const userDepartmentId = userProfile?.departmentId ?? null;

  const handleMonthChange = (year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonth(month);
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Attendance</h2>
        <p className="text-sm text-muted-foreground">
          Track your work hours, shifts, and breaks.
        </p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="today" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Today
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1.5 text-xs">
            <Palmtree className="h-3.5 w-3.5" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="leavecard" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Leave Card
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <TodayAttendanceView userPrincipal={userPrincipal} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AttendanceHistoryView />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="space-y-4">
            <AttendanceMonthCalendar
              year={calendarYear}
              month={calendarMonth}
              onMonthChange={handleMonthChange}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              attendanceEntries={attendanceEntriesMap}
              holidays={holidays}
              userDepartmentId={userDepartmentId}
            />
            {selectedDate && (
              <div className="relative">
                <button
                  type="button"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10 text-xs"
                  onClick={() => setSelectedDate(null)}
                >
                  ✕ Close
                </button>
                <AttendanceDateEditor
                  date={selectedDate}
                  entry={selectedDateEntry}
                  onSave={handleSaveAttendanceEntry}
                  isSaving={editEntry.isPending}
                  canEditSelectedDate={
                    isAdmin ||
                    selectedDate === new Date().toISOString().slice(0, 10)
                  }
                  permissionMessage="You do not have permission to edit this date. Only admins can edit past or future entries."
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <HolidayManager
            holidays={holidays}
            currentMonth={calendarMonth}
            currentYear={calendarYear}
          />
        </TabsContent>

        <TabsContent value="leavecard" className="mt-4">
          <LeaveCardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
