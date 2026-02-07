import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save } from 'lucide-react';
import { AttendanceStatus } from '../../backend';
import type { AttendanceDayEntry } from '../../backend';

interface AttendanceDateEditorProps {
  date: string;
  entry: AttendanceDayEntry | null;
  onSave: (entry: AttendanceDayEntry) => Promise<void>;
  isSaving: boolean;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.present]: 'Present',
  [AttendanceStatus.leave]: 'Leave',
  [AttendanceStatus.halfDay]: 'Half Day',
  [AttendanceStatus.weeklyOff]: 'Weekly Off',
  [AttendanceStatus.festival]: 'Festival',
  [AttendanceStatus.companyLeave]: 'Company Leave',
};

const NON_WORKING_STATUSES = [
  AttendanceStatus.leave,
  AttendanceStatus.weeklyOff,
  AttendanceStatus.festival,
  AttendanceStatus.companyLeave,
];

export function AttendanceDateEditor({ date, entry, onSave, isSaving }: AttendanceDateEditorProps) {
  const [status, setStatus] = useState<AttendanceStatus>(entry?.status || AttendanceStatus.present);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Format date for display
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Load entry data when it changes
  useEffect(() => {
    if (entry) {
      setStatus(entry.status);
      setNote(entry.note || '');
      
      // Convert timestamps to time strings
      if (entry.checkIn) {
        const checkInDate = new Date(Number(entry.checkIn) / 1_000_000);
        setCheckInTime(checkInDate.toTimeString().slice(0, 5));
      } else {
        setCheckInTime('');
      }
      
      if (entry.checkOut) {
        const checkOutDate = new Date(Number(entry.checkOut) / 1_000_000);
        setCheckOutTime(checkOutDate.toTimeString().slice(0, 5));
      } else {
        setCheckOutTime('');
      }
    } else {
      setStatus(AttendanceStatus.present);
      setCheckInTime('');
      setCheckOutTime('');
      setNote('');
    }
    setError(null);
  }, [entry, date]);

  const isNonWorkingStatus = NON_WORKING_STATUSES.includes(status);

  const handleSave = async () => {
    setError(null);

    // Validate times for working statuses
    if (!isNonWorkingStatus) {
      if (!checkInTime) {
        setError('Check-in time is required for working days');
        return;
      }
      if (checkOutTime && checkInTime >= checkOutTime) {
        setError('Check-out time must be after check-in time');
        return;
      }
    }

    // Build the entry
    let checkIn: bigint | undefined;
    let checkOut: bigint | undefined;
    let workingTime = BigInt(0);

    if (!isNonWorkingStatus && checkInTime) {
      // Parse time and combine with date
      const [hours, minutes] = checkInTime.split(':').map(Number);
      const checkInDate = new Date(date + 'T00:00:00');
      checkInDate.setHours(hours, minutes, 0, 0);
      checkIn = BigInt(checkInDate.getTime() * 1_000_000);

      if (checkOutTime) {
        const [outHours, outMinutes] = checkOutTime.split(':').map(Number);
        const checkOutDate = new Date(date + 'T00:00:00');
        checkOutDate.setHours(outHours, outMinutes, 0, 0);
        checkOut = BigInt(checkOutDate.getTime() * 1_000_000);

        // Calculate working time in seconds
        const durationMs = Number(checkOut - checkIn) / 1_000_000;
        if (durationMs > 0) {
          workingTime = BigInt(Math.floor(durationMs / 1000));
        }
      }
    }

    const updatedEntry: AttendanceDayEntry = {
      status,
      checkIn,
      checkOut,
      note: note.trim(),
      workingTime,
    };

    try {
      await onSave(updatedEntry);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance';
      setError(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Attendance</CardTitle>
        <CardDescription>{displayDate}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status selector */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time inputs - only for working statuses */}
        {!isNonWorkingStatus && (
          <>
            <div className="space-y-2">
              <Label htmlFor="check-in">Check-in Time</Label>
              <Input
                id="check-in"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="check-out">Check-out Time (optional)</Label>
              <Input
                id="check-out"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>
          </>
        )}

        {/* Work Brief Note */}
        <div className="space-y-2">
          <Label htmlFor="work-note">Work Brief Note</Label>
          <Textarea
            id="work-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Brief description of work done (optional)"
            rows={3}
          />
        </div>

        {/* Helper text for non-working statuses */}
        {isNonWorkingStatus && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This status indicates a non-working day. Working time will be set to 0.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Attendance'}
        </Button>
      </CardContent>
    </Card>
  );
}
