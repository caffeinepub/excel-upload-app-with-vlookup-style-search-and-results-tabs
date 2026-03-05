import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, FileText, Loader2, LogIn, LogOut } from "lucide-react";
import React, { useState } from "react";
import { AttendanceStatus } from "../../backend";
import {
  useCheckOut,
  useGetAttendanceEntries,
  useTodayCheckIn,
} from "../../hooks/useAttendance";

interface TodayAttendanceViewProps {
  userPrincipal: string;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.present]: "Present",
  [AttendanceStatus.leave]: "Leave",
  [AttendanceStatus.halfDay]: "Half Day",
  [AttendanceStatus.weeklyOff]: "Weekly Off",
  [AttendanceStatus.festival]: "Festival Leave",
  [AttendanceStatus.companyLeave]: "Company Leave",
  [AttendanceStatus.holiday]: "Holiday",
};

function formatNsTime(ns: bigint | undefined): string {
  if (!ns) return "--:--";
  const ms = Number(ns) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkingTime(seconds: bigint): string {
  const totalMinutes = Number(seconds) / 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours === 0 && minutes === 0) return "0h 0m";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export default function TodayAttendanceView({
  userPrincipal: _userPrincipal,
}: TodayAttendanceViewProps) {
  const today = getTodayDateString();
  const { data: entries = [], isLoading } = useGetAttendanceEntries();
  const checkIn = useTodayCheckIn();
  const checkOut = useCheckOut();

  const [workNote, setWorkNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const todayEntry = entries.find(([date]) => date === today)?.[1] ?? null;

  const isCheckedIn = !!todayEntry?.checkIn && !todayEntry?.checkOut;
  const isCheckedOut = !!todayEntry?.checkIn && !!todayEntry?.checkOut;

  const handleCheckIn = async () => {
    await checkIn.mutateAsync({
      date: today,
      status: AttendanceStatus.present,
      workBrief: workNote,
    });
    setWorkNote("");
    setShowNoteInput(false);
  };

  const handleCheckOut = async () => {
    await checkOut.mutateAsync({ date: today, note: workNote });
    setWorkNote("");
    setShowNoteInput(false);
  };

  const isLoading2 = checkIn.isPending || checkOut.isPending || isLoading;

  const displayDate = new Date(`${today}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <Card className="border-border bg-card" data-ocid="today-attendance.card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Today — {displayDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status summary */}
          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={
                  isCheckedIn
                    ? "default"
                    : isCheckedOut
                      ? "secondary"
                      : "outline"
                }
              >
                {isCheckedIn
                  ? "Clocked In"
                  : isCheckedOut
                    ? "Clocked Out"
                    : "Not Started"}
              </Badge>
            </div>
            {todayEntry?.status && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Day Type</p>
                <Badge variant="outline">
                  {STATUS_LABELS[todayEntry.status]}
                </Badge>
              </div>
            )}
            {todayEntry?.checkIn && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Check In</p>
                <p className="font-semibold text-sm text-green-600">
                  {formatNsTime(todayEntry.checkIn)}
                </p>
              </div>
            )}
            {todayEntry?.checkOut && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Check Out</p>
                <p className="font-semibold text-sm text-red-500">
                  {formatNsTime(todayEntry.checkOut)}
                </p>
              </div>
            )}
            {todayEntry?.workingTime != null &&
              todayEntry.workingTime > BigInt(0) && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Working Time</p>
                  <p className="font-semibold text-sm text-primary">
                    {formatWorkingTime(todayEntry.workingTime)}
                  </p>
                </div>
              )}
          </div>

          {/* Work Note Input */}
          {(showNoteInput || isCheckedIn) && (
            <div
              className="space-y-1"
              data-ocid="today-attendance.note-section"
            >
              <Label className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" /> Work Note (optional)
              </Label>
              <Textarea
                data-ocid="today-attendance.note-input"
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="Briefly describe your work today..."
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!todayEntry?.checkIn && (
              <>
                {!showNoteInput && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setShowNoteInput(true)}
                    data-ocid="today-attendance.add-note-button"
                  >
                    <FileText className="h-3 w-3" />
                    Add Work Note
                  </Button>
                )}
                <Button
                  onClick={handleCheckIn}
                  disabled={isLoading2}
                  className="gap-2"
                  size="sm"
                  data-ocid="today-attendance.checkin-button"
                >
                  {checkIn.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Check In
                </Button>
              </>
            )}

            {isCheckedIn && (
              <Button
                onClick={handleCheckOut}
                disabled={isLoading2}
                variant="outline"
                className="gap-2"
                size="sm"
                data-ocid="today-attendance.checkout-button"
              >
                {checkOut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Check Out
              </Button>
            )}
          </div>

          {/* Work note display after checkout */}
          {isCheckedOut && todayEntry?.note && (
            <div
              className="bg-muted/50 rounded p-3"
              data-ocid="today-attendance.note-display"
            >
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Work Note
              </p>
              <p className="text-sm">{todayEntry.note}</p>
            </div>
          )}

          {(checkIn.isError || checkOut.isError) && (
            <p
              className="text-xs text-destructive"
              data-ocid="today-attendance.error-state"
            >
              {String((checkIn.error || checkOut.error) ?? "An error occurred")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!todayEntry && !isLoading2 && (
        <div
          className="text-center py-8 text-muted-foreground"
          data-ocid="today-attendance.empty-state"
        >
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            No attendance recorded today. Click "Check In" to start.
          </p>
        </div>
      )}
    </div>
  );
}
