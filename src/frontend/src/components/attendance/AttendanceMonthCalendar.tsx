import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AttendanceDayEntry, Holiday } from "../../backend";

interface AttendanceMonthCalendarProps {
  year: number;
  month: number; // 0-11
  onMonthChange: (year: number, month: number) => void;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  attendanceEntries: Map<string, AttendanceDayEntry>;
  holidays: Holiday[];
  userDepartmentId?: bigint | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

export function AttendanceMonthCalendar({
  year,
  month,
  onMonthChange,
  onDateSelect,
  selectedDate,
  attendanceEntries,
  holidays,
  userDepartmentId,
}: AttendanceMonthCalendarProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build holiday map for quick lookup (only applicable holidays)
  const holidayMap = new Map<string, Holiday>();
  for (const h of holidays) {
    if (isHolidayApplicable(h, userDepartmentId)) {
      const dateStr = timestampToDateString(h.date);
      holidayMap.set(dateStr, h);
    }
  }

  // Calculate calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const calendarDays: Array<{ date: number; dateStr: string } | null> = [];

  for (let i = 0; i < startWeekday; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({ date: day, dateStr });
  }

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const getDayStyle = (dateStr: string) => {
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasEntry = attendanceEntries.has(dateStr);
    const holiday = holidayMap.get(dateStr);

    let bgClass = "bg-background hover:bg-muted";
    let textClass = "text-foreground";
    let borderClass = "";
    let dotColor = "";
    let holidayTitle = "";

    if (isSelected) {
      bgClass = "bg-primary text-primary-foreground hover:bg-primary/90";
      textClass = "text-primary-foreground";
    } else if (isToday) {
      borderClass = "ring-2 ring-primary";
    }

    if (holiday && !isSelected) {
      holidayTitle = `${holiday.name} (${holiday.holidayType})`;
      const type = holiday.holidayType;
      if (type === "Festival" || type === "festival") {
        bgClass =
          "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50";
        textClass = "text-purple-900 dark:text-purple-100";
        dotColor = "bg-purple-500";
      } else if (type === "Company" || type === "companyLeave") {
        bgClass =
          "bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50";
        textClass = "text-orange-900 dark:text-orange-100";
        dotColor = "bg-orange-500";
      } else {
        // Public or other
        bgClass =
          "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50";
        textClass = "text-blue-900 dark:text-blue-100";
        dotColor = "bg-blue-500";
      }
    } else if (hasEntry && !isSelected) {
      const entry = attendanceEntries.get(dateStr);
      if (entry?.status === "present") {
        bgClass =
          "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50";
        textClass = "text-green-900 dark:text-green-100";
      } else if (entry?.status === "leave") {
        bgClass =
          "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50";
        textClass = "text-red-900 dark:text-red-100";
      } else if (entry?.status === "halfDay") {
        bgClass =
          "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50";
        textClass = "text-yellow-900 dark:text-yellow-100";
      } else if (entry?.status === "weeklyOff") {
        bgClass =
          "bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800/70";
        textClass = "text-gray-600 dark:text-gray-400";
      } else {
        bgClass =
          "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50";
        textClass = "text-green-900 dark:text-green-100";
      }
    }

    return { bgClass, textClass, borderClass, dotColor, holidayTitle };
  };

  return (
    <Card className="p-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {MONTH_NAMES[month]} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            // biome-ignore lint/suspicious/noArrayIndexKey: empty placeholder cells have no stable id
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const { bgClass, textClass, borderClass, dotColor, holidayTitle } =
            getDayStyle(day.dateStr);

          return (
            <button
              type="button"
              key={day.dateStr}
              onClick={() => onDateSelect(day.dateStr)}
              title={holidayTitle || undefined}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center text-sm font-medium transition-colors relative",
                bgClass,
                textClass,
                borderClass,
              )}
            >
              <span>{day.date}</span>
              {dotColor && (
                <span className={cn("w-1 h-1 rounded-full mt-0.5", dotColor)} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t pt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 inline-block" />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50 inline-block" />
          Leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/50 inline-block" />
          Half Day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/50 inline-block" />
          Public Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900/50 inline-block" />
          Festival
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/50 inline-block" />
          Company Leave
        </span>
      </div>
    </Card>
  );
}
