import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import {
  useGetAttendanceConfig,
  useSaveAttendanceConfig,
  useTodayCheckIn,
  useCheckOut,
  useGetAttendanceSummary,
  useGetAttendanceEntry,
  useEditAttendanceEntry,
  useHasCustomDatePermission,
  useAddWorkNote,
} from '../hooks/useAttendance';
import { useIsCallerAdmin } from '../hooks/useApproval';
import { useGetAllHolidays } from '../hooks/useHolidays';
import {
  formatDateForBackend,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getCurrentYearRange,
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
import { Textarea } from '@/components/ui/textarea';
import { Clock, Calendar, Settings, LogIn, LogOut, AlertCircle, X } from 'lucide-react';
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
  const [workBrief, setWorkBrief] = useState('');
  const [checkoutWorkNote, setCheckoutWorkNote] = useState('');
  const [showCheckoutNoteInput, setShowCheckoutNoteInput] = useState(false);

  // Calendar state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Settings state
  const [regularHours, setRegularHours] = useState('8');
  const [regularMinutes, setRegularMinutes] = useState('0');
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]);
  const [leavePolicy, setLeavePolicy] = useState('20');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Summary state
  const [rangeType, setRangeType] = useState<RangeType>('week');
  const [dateRange, setDateRange] = useState<[string, string]>(getCurrentWeekRange());

  // Queries and mutations
  const { data: config } = useGetAttendanceConfig();
  const saveConfig = useSaveAttendanceConfig();
  const todayCheckIn = useTodayCheckIn();
  const checkOut = useCheckOut();
  const addWorkNote = useAddWorkNote();
  const { data: summary, isLoading: summaryLoading } = useGetAttendanceSummary(dateRange);
  const { data: holidays = [] } = useGetAllHolidays();
  const { data: selectedDateEntry } = useGetAttendanceEntry(selectedDate || '');
  const editEntry = useEditAttendanceEntry();
  const { data: hasCustomDatePermission = false } = useHasCustomDatePermission();
  const { data: isAdmin = false } = useIsCallerAdmin();

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
      setWeeklyOffDays(config.weeklyOffDays.map((d) => Number(d)));
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

  // Check today's attendance status
  const todayEntry = attendanceEntriesMap.get(currentDate);
  useEffect(() => {
    if (todayEntry) {
      setHasCheckedIn(!!todayEntry.checkIn);
      setHasCheckedOut(!!todayEntry.checkOut);
      setCheckInTime(todayEntry.checkIn ?? null);
      setCheckOutTime(todayEntry.checkOut ?? null);
    } else {
      setHasCheckedIn(false);
      setHasCheckedOut(false);
      setCheckInTime(null);
      setCheckOutTime(null);
    }
  }, [todayEntry, currentDate]);

  const handleCheckIn = async () => {
    try {
      await todayCheckIn.mutateAsync({
        date: currentDate,
        status: AttendanceStatus.present,
        workBrief: workBrief.trim(),
      });
      toast.success('Checked in successfully!');
      setWorkBrief('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check in';
      toast.error(message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync({ date: currentDate });
      toast.success('Checked out successfully!');
      setShowCheckoutNoteInput(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check out';
      toast.error(message);
    }
  };

  const handleSaveCheckoutNote = async () => {
    if (!checkoutWorkNote.trim()) {
      toast.error('Please enter a work note');
      return;
    }

    try {
      const existingNote = todayEntry?.note || '';
      const combinedNote = existingNote
        ? `${existingNote}\n\nCheckout Note: ${checkoutWorkNote.trim()}`
        : `Checkout Note: ${checkoutWorkNote.trim()}`;

      await addWorkNote.mutateAsync({
        date: currentDate,
        note: combinedNote,
      });
      toast.success('Work note saved successfully!');
      setCheckoutWorkNote('');
      setShowCheckoutNoteInput(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save work note';
      toast.error(message);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(null);

    const validation = validateAttendanceConfig(regularHours, regularMinutes, weeklyOffDays, leavePolicy);
    if (!validation.valid) {
      setSettingsError(validation.error || 'Invalid configuration');
      return;
    }

    try {
      const newConfig = createAttendanceConfig(regularHours, regularMinutes, weeklyOffDays, leavePolicy);
      await saveConfig.mutateAsync(newConfig);
      toast.success('Settings saved successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setSettingsError(message);
      toast.error(message);
    }
  };

  const handleSaveAttendanceEntry = async (entry: AttendanceDayEntry) => {
    if (!selectedDate) return;

    try {
      await editEntry.mutateAsync({ date: selectedDate, entry });
      toast.success('Attendance saved successfully!');
      setSelectedDate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save attendance';
      toast.error(message);
      throw error;
    }
  };

  const toggleWeeklyOffDay = (day: number) => {
    setWeeklyOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Determine if the selected date can be edited
  const isSelectedDateToday = selectedDate === currentDate;
  const canEditSelectedDate = isSelectedDateToday || isAdmin || hasCustomDatePermission;
  const permissionMessage = !canEditSelectedDate
    ? 'You do not have permission to edit past or future attendance entries. Only admins or users with custom date permission can edit non-today entries.'
    : undefined;

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access attendance features.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="w-8 h-8" />
          Attendance
        </h1>
        <p className="text-muted-foreground mt-1">Track your working hours and attendance</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Today's Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasCheckedIn ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="work-brief">Work Brief (optional)</Label>
                    <Textarea
                      id="work-brief"
                      value={workBrief}
                      onChange={(e) => setWorkBrief(e.target.value)}
                      placeholder="Brief description of today's work plan..."
                      rows={3}
                      disabled={!isActorReady}
                    />
                    <p className="text-sm text-muted-foreground">
                      Add a brief note about your work plan for today before checking in.
                    </p>
                  </div>
                  <Button
                    onClick={handleCheckIn}
                    disabled={todayCheckIn.isPending || !isActorReady}
                    className="w-full"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {todayCheckIn.isPending ? 'Checking in...' : 'Check In'}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Checked In</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {checkInTime ? formatTime(checkInTime) : 'N/A'}
                      </p>
                    </div>
                    {hasCheckedOut && checkOutTime && (
                      <div className="text-right">
                        <p className="font-medium text-green-900 dark:text-green-100">Checked Out</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {formatTime(checkOutTime)}
                        </p>
                      </div>
                    )}
                  </div>

                  {todayEntry?.note && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Work Notes:
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                        {todayEntry.note}
                      </p>
                    </div>
                  )}

                  {!hasCheckedOut && (
                    <Button
                      onClick={handleCheckOut}
                      disabled={checkOut.isPending || !isActorReady}
                      variant="outline"
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {checkOut.isPending ? 'Checking out...' : 'Check Out'}
                    </Button>
                  )}

                  {/* Checkout work note input */}
                  {hasCheckedOut && showCheckoutNoteInput && (
                    <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                      <Label htmlFor="checkout-note">Add Work Note (optional)</Label>
                      <Textarea
                        id="checkout-note"
                        value={checkoutWorkNote}
                        onChange={(e) => setCheckoutWorkNote(e.target.value)}
                        placeholder="What did you accomplish today?"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveCheckoutNote}
                          disabled={addWorkNote.isPending}
                          size="sm"
                        >
                          {addWorkNote.isPending ? 'Saving...' : 'Save Note'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCheckoutNoteInput(false)}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Summary</CardTitle>
                  <CardDescription>Overview of your attendance</CardDescription>
                </div>
                <Select
                  value={rangeType}
                  onValueChange={(v) => setRangeType(v as RangeType)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <p className="text-sm text-muted-foreground">Loading summary...</p>
              ) : summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {Number(summary.presentDays)}
                    </p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {Number(summary.leaveDays)}
                    </p>
                    <p className="text-xs text-muted-foreground">Leave</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      {Number(summary.halfDays)}
                    </p>
                    <p className="text-xs text-muted-foreground">Half Days</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {Number(summary.totalDays)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Days</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No summary data available.</p>
              )}
            </CardContent>
          </Card>

          {/* PDF Export */}
          <AttendancePdfExportSection />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Attendance Calendar
              </CardTitle>
              <CardDescription>View and edit your attendance by date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AttendanceMonthCalendar
                year={calendarYear}
                month={calendarMonth}
                attendanceEntries={attendanceEntriesMap}
                holidays={holidays}
                onDateSelect={(date) => setSelectedDate(date)}
                selectedDate={selectedDate}
                onMonthChange={(newYear, newMonth) => {
                  setCalendarYear(newYear);
                  setCalendarMonth(newMonth);
                }}
              />

              {selectedDate && (
                <div className="space-y-2">
                  {/* Close button rendered by parent since AttendanceDateEditor has no onCancel */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Editing: {selectedDate}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(null)}
                      className="h-7 w-7"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <AttendanceDateEditor
                    date={selectedDate}
                    entry={selectedDateEntry ?? null}
                    onSave={handleSaveAttendanceEntry}
                    isSaving={editEntry.isPending}
                    canEditSelectedDate={canEditSelectedDate}
                    permissionMessage={permissionMessage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-6">
          <HolidayManager
            holidays={holidays}
            currentMonth={calendarMonth}
            currentYear={calendarYear}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Attendance Settings
              </CardTitle>
              <CardDescription>Configure your working hours and attendance policy</CardDescription>
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
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={regularHours}
                    onChange={(e) => setRegularHours(e.target.value)}
                    className="w-20"
                    placeholder="8"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={regularMinutes}
                    onChange={(e) => setRegularMinutes(e.target.value)}
                    className="w-20"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>

              {/* Weekly Off Days */}
              <div className="space-y-2">
                <Label>Weekly Off Days</Label>
                <div className="flex flex-wrap gap-3">
                  {WEEKDAY_NAMES.map((day, index) => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${index}`}
                        checked={weeklyOffDays.includes(index)}
                        onCheckedChange={() => toggleWeeklyOffDay(index)}
                      />
                      <Label htmlFor={`day-${index}`} className="font-normal cursor-pointer">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Policy */}
              <div className="space-y-2">
                <Label htmlFor="leave-policy">Annual Leave Days</Label>
                <Input
                  id="leave-policy"
                  type="number"
                  min="0"
                  value={leavePolicy}
                  onChange={(e) => setLeavePolicy(e.target.value)}
                  className="w-32"
                  placeholder="20"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saveConfig.isPending || !isActorReady}
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
