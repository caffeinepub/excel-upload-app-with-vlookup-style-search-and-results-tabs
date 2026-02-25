import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AttendanceDayEntry, HolidayEntry } from '../../backend';

interface AttendanceMonthCalendarProps {
  year: number;
  month: number; // 0-11
  onMonthChange: (year: number, month: number) => void;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  attendanceEntries: Map<string, AttendanceDayEntry>;
  holidays: HolidayEntry[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AttendanceMonthCalendar({
  year,
  month,
  onMonthChange,
  onDateSelect,
  selectedDate,
  attendanceEntries,
  holidays,
}: AttendanceMonthCalendarProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build holiday map for quick lookup
  const holidayMap = new Map<string, HolidayEntry>();
  holidays.forEach(h => holidayMap.set(h.date, h));

  // Calculate calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const calendarDays: Array<{ date: number; dateStr: string } | null> = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startWeekday; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    let bgClass = 'bg-background hover:bg-muted';
    let textClass = 'text-foreground';
    let borderClass = '';

    if (isSelected) {
      bgClass = 'bg-primary text-primary-foreground hover:bg-primary/90';
      textClass = 'text-primary-foreground';
    } else if (isToday) {
      borderClass = 'ring-2 ring-primary';
    }

    if (holiday) {
      if (holiday.holidayType === 'festival') {
        bgClass = isSelected ? bgClass : 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50';
        textClass = isSelected ? textClass : 'text-purple-900 dark:text-purple-100';
      } else if (holiday.holidayType === 'companyLeave') {
        bgClass = isSelected ? bgClass : 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50';
        textClass = isSelected ? textClass : 'text-orange-900 dark:text-orange-100';
      }
    } else if (hasEntry && !isSelected) {
      bgClass = 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50';
      textClass = 'text-green-900 dark:text-green-100';
    }

    return { bgClass, textClass, borderClass };
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
        {WEEKDAY_LABELS.map(label => (
          <div key={label} className="text-center text-sm font-medium text-muted-foreground py-2">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const { bgClass, textClass, borderClass } = getDayStyle(day.dateStr);

          return (
            <button
              key={day.dateStr}
              onClick={() => onDateSelect(day.dateStr)}
              className={cn(
                'aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-colors',
                bgClass,
                textClass,
                borderClass
              )}
            >
              {day.date}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t space-y-2">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Legend:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-primary" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
            <span>Has Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30" />
            <span>Festival</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30" />
            <span>Company Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>Selected</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
