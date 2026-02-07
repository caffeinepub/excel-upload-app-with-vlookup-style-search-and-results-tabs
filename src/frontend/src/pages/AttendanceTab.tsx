import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import {
  useGetAttendanceConfig,
  useSaveAttendanceConfig,
  useCheckIn,
  useCheckOut,
  useGetAttendanceSummary,
  useGetAttendanceEntry,
  useEditAttendanceEntry,
} from '../hooks/useAttendance';
import { useGetAllHolidays } from '../hooks/useHolidays';
import {
  formatDateForBackend,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getCurrentYearRange,
  formatDuration,
  formatTime,
} from '../lib/attendance/dateRanges';
import {
  secondsToHoursMinutes,
  validateAttendanceConfig,
  createAttendanceConfig,
} from '../utils/attendance/configMapping';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar, Settings, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { AttendanceStatus } from '../backend';
import { toast } from 'sonner';
import { AttendanceMonthCalendar } from '../components/attendance/AttendanceMonthCalendar';
import { AttendanceDateEditor } from '../components/attendance/AttendanceDateEditor';
import { HolidayManager } from '../components/attendance/HolidayManager';
import { AttendancePdfExportSection } from '../components/attendance/AttendancePdfExportSection';
import type { AttendanceDayEntry } from '../backend';

type RangeType = 'week' | 'month' | 'year';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AttendanceTab() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  // Current date state
  const [currentDate] = useState(() => formatDateForBackend(new Date()));
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<bigint | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<bigint | null>(null);

  // Calendar state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Settings state
  const [regularHours, setRegularHours] = useState('8');
  const [regularMinutes, setRegularMinutes] = useState('0');
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]); // Sunday and Saturday
  const [leavePolicy, setLeavePolicy] = useState('20');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Summary state
  const [rangeType, setRangeType] = useState<RangeType>('week');
  const [dateRange, setDateRange] = useState<[string, string]>(getCurrentWeekRange());

  // Queries and mutations
  const { data: config, isLoading: configLoading } = useGetAttendanceConfig();
  const saveConfig = useSaveAttendanceConfig();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const { data: summary, isLoading: summaryLoading } = useGetAttendanceSummary(dateRange);
  const { data: holidays = [] } = useGetAllHolidays();
  const { data: selectedDateEntry, isLoading: entryLoading } = useGetAttendanceEntry(selectedDate || '');
  const editEntry = useEditAttendanceEntry();

  // Calculate month range for calendar view
  const calendarMonthRange: [string, string] = [
    `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`,
    `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${new Date(calendarYear, calendarMonth + 1, 0).getDate()}`,
  ];
  const { data: calendarSummary } = useGetAttendanceSummary(calendarMonthRange);

  // Build attendance entries map for calendar
  const attendanceEntriesMap = new Map<string, AttendanceDayEntry>();
  if (calendarSummary?.breakdown) {
    calendarSummary.breakdown.forEach(([date, entry]) => {
      attendanceEntriesMap.set(date, entry);
    });
  }

  // Load config into form when fetched
  useEffect(() => {
    if (config) {
      const { hours, minutes } = secondsToHoursMinutes(config.regularWorkingTime);
      setRegularHours(String(hours));
      setRegularMinutes(String(minutes));
      setWeeklyOffDays(config.weeklyOffDays.map(d => Number(d)));
      setLeavePolicy(String(config.leavePolicy));
    }
  }, [config]);

  // Update date range when range type changes
  useEffect(() => {
    if (rangeType === 'week') {
      setDateRange(getCurrentWeekRange());
    } else if (rangeType === 'month') {
      setDateRange(getCurrentMonthRange());
    } else if (rangeType === 'year') {
      setDateRange(getCurrentYearRange());
    }
  }, [rangeType]);

  // Check today's attendance status from summary
  useEffect(() => {
    if (summary && summary.breakdown) {
      const todayEntry = summary.breakdown.find(([date]) => date === currentDate);
      if (todayEntry) {
        const [, entry] = todayEntry;
        setHasCheckedIn(!!entry.checkIn);
        setHasCheckedOut(!!entry.checkOut);
        setCheckInTime(entry.checkIn || null);
        setCheckOutTime(entry.checkOut || null);
      }
    }
  }, [summary, currentDate]);

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync({ date: currentDate, status: AttendanceStatus.present });
      setHasCheckedIn(true);
      setCheckInTime(BigInt(Date.now() * 1_000_000));
      toast.success('Checked in successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check in';
      toast.error(message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync(currentDate);
      setHasCheckedOut(true);
      setCheckOutTime(BigInt(Date.now() * 1_000_000));
      toast.success('Checked out successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check out';
      toast.error(message);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(null);

    const validation = validateAttendanceConfig(regularHours, regularMinutes, weeklyOffDays, leavePolicy);
    if (!validation.valid) {
      setSettingsError(validation.error || 'Invalid settings');
      return;
    }

    try {
      const newConfig = createAttendanceConfig(regularHours, regularMinutes, weeklyOffDays, leavePolicy);
      await saveConfig.mutateAsync(newConfig);
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setSettingsError(message);
      toast.error(message);
    }
  };

  const toggleWeeklyOffDay = (day: number) => {
    setWeeklyOffDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveAttendanceEntry = async (entry: AttendanceDayEntry) => {
    if (!selectedDate) return;

    try {
      await editEntry.mutateAsync({ date: selectedDate, entry });
      toast.success('Attendance saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save attendance';
      throw new Error(message);
    }
  };

  const todayWorkingTime = summary?.breakdown.find(([date]) => date === currentDate)?.[1]?.workingTime || BigInt(0);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to manage attendance
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isActorReady) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connecting to backend...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Attendance</h1>
        <p className="text-muted-foreground">Track your daily attendance and working hours</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Today's Check-in/Check-out */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Today's Attendance
              </CardTitle>
              <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleCheckIn}
                  disabled={hasCheckedIn || checkIn.isPending}
                  className="flex-1 min-w-[150px]"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {checkIn.isPending ? 'Checking In...' : hasCheckedIn ? 'Checked In' : 'Check In'}
                </Button>
                <Button
                  onClick={handleCheckOut}
                  disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
                  variant="outline"
                  className="flex-1 min-w-[150px]"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {checkOut.isPending ? 'Checking Out...' : hasCheckedOut ? 'Checked Out' : 'Check Out'}
                </Button>
              </div>

              {hasCheckedIn && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in Time</p>
                    <p className="text-lg font-semibold">{checkInTime ? formatTime(checkInTime) : '--:--'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out Time</p>
                    <p className="text-lg font-semibold">{checkOutTime ? formatTime(checkOutTime) : '--:--'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Working Time</p>
                    <p className="text-lg font-semibold">{formatDuration(Number(todayWorkingTime))}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Attendance Summary
              </CardTitle>
              <CardDescription>View your attendance statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="range-select">Period:</Label>
                <Select value={rangeType} onValueChange={(value) => setRangeType(value as RangeType)}>
                  <SelectTrigger id="range-select" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {summaryLoading ? (
                <p className="text-muted-foreground">Loading summary...</p>
              ) : summary ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Days</p>
                    <p className="text-2xl font-bold">{Number(summary.totalDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-green-600">{Number(summary.presentDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Leave</p>
                    <p className="text-2xl font-bold text-red-600">{Number(summary.leaveDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Half Day</p>
                    <p className="text-2xl font-bold text-yellow-600">{Number(summary.halfDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Festival</p>
                    <p className="text-2xl font-bold text-purple-600">{Number(summary.festivalDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Company Leave</p>
                    <p className="text-2xl font-bold text-orange-600">{Number(summary.companyLeaveDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Weekly Off</p>
                    <p className="text-2xl font-bold text-blue-600">{Number(summary.weeklyOffDays)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Working Time</p>
                    <p className="text-2xl font-bold">{formatDuration(Number(summary.totalWorkingTime))}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No attendance data available</p>
              )}
            </CardContent>
          </Card>

          {/* PDF Export Section */}
          <AttendancePdfExportSection />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Month Calendar */}
            <AttendanceMonthCalendar
              year={calendarYear}
              month={calendarMonth}
              onMonthChange={(year, month) => {
                setCalendarYear(year);
                setCalendarMonth(month);
              }}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              attendanceEntries={attendanceEntriesMap}
              holidays={holidays}
            />

            {/* Date Editor */}
            {selectedDate ? (
              entryLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Loading...</p>
                  </CardContent>
                </Card>
              ) : (
                <AttendanceDateEditor
                  date={selectedDate}
                  entry={selectedDateEntry || null}
                  onSave={handleSaveAttendanceEntry}
                  isSaving={editEntry.isPending}
                />
              )
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Select a date from the calendar to view or edit attendance
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-6">
          <HolidayManager
            holidays={holidays}
            currentMonth={calendarMonth}
            currentYear={calendarYear}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Attendance Settings
              </CardTitle>
              <CardDescription>Configure your working hours and leave policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{settingsError}</AlertDescription>
                </Alert>
              )}

              {/* Regular Working Time */}
              <div className="space-y-2">
                <Label>Regular Working Time</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={regularHours}
                      onChange={(e) => setRegularHours(e.target.value)}
                      placeholder="Hours"
                    />
                  </div>
                  <span className="text-muted-foreground">hours</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={regularMinutes}
                      onChange={(e) => setRegularMinutes(e.target.value)}
                      placeholder="Minutes"
                    />
                  </div>
                  <span className="text-muted-foreground">minutes</span>
                </div>
              </div>

              {/* Weekly Off Days */}
              <div className="space-y-2">
                <Label>Weekly Off Days</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WEEKDAY_NAMES.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${index}`}
                        checked={weeklyOffDays.includes(index)}
                        onCheckedChange={() => toggleWeeklyOffDay(index)}
                      />
                      <Label htmlFor={`day-${index}`} className="text-sm font-normal cursor-pointer">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Policy */}
              <div className="space-y-2">
                <Label htmlFor="leave-policy">Leave Policy (days per year)</Label>
                <Input
                  id="leave-policy"
                  type="number"
                  min="0"
                  value={leavePolicy}
                  onChange={(e) => setLeavePolicy(e.target.value)}
                  placeholder="20"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saveConfig.isPending || configLoading}
              >
                {saveConfig.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
