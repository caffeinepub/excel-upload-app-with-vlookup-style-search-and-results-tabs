import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, FileText, History } from "lucide-react";
import React, { useState } from "react";
import { AttendanceStatus } from "../../backend";
import { useGetAttendanceEntries } from "../../hooks/useAttendance";
import AttendancePdfExportSection from "./AttendancePdfExportSection";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.present]: "Present",
  [AttendanceStatus.leave]: "Leave",
  [AttendanceStatus.halfDay]: "Half Day",
  [AttendanceStatus.weeklyOff]: "Weekly Off",
  [AttendanceStatus.festival]: "Festival Leave",
  [AttendanceStatus.companyLeave]: "Company Leave",
  [AttendanceStatus.holiday]: "Holiday",
};

const STATUS_BADGE_VARIANT: Record<
  AttendanceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  [AttendanceStatus.present]: "default",
  [AttendanceStatus.leave]: "destructive",
  [AttendanceStatus.halfDay]: "secondary",
  [AttendanceStatus.weeklyOff]: "outline",
  [AttendanceStatus.festival]: "secondary",
  [AttendanceStatus.companyLeave]: "secondary",
  [AttendanceStatus.holiday]: "outline",
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

export default function AttendanceHistoryView() {
  const { data: entries = [], isLoading } = useGetAttendanceEntries();
  const [page, setPage] = useState(0);

  const sorted = [...entries].sort(([a], [b]) => b.localeCompare(a));
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageEntries = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12 text-muted-foreground"
        data-ocid="attendance-history.loading-state"
      >
        Loading attendance history...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PDF Download Section */}
      <AttendancePdfExportSection entries={entries} />

      {sorted.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="attendance-history.empty-state"
        >
          <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No attendance history yet.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3" data-ocid="attendance-history.list">
            {pageEntries.map(([date, entry], idx) => {
              const isNonWorking = [
                AttendanceStatus.leave,
                AttendanceStatus.weeklyOff,
                AttendanceStatus.festival,
                AttendanceStatus.companyLeave,
                AttendanceStatus.holiday,
              ].includes(entry.status);

              const displayDate = new Date(
                `${date}T00:00:00`,
              ).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <Card
                  key={date}
                  className="border-border"
                  data-ocid={`attendance-history.item.${idx + 1}`}
                >
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {displayDate}
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={STATUS_BADGE_VARIANT[entry.status]}>
                          {STATUS_LABELS[entry.status]}
                        </Badge>
                        {!isNonWorking && entry.workingTime > BigInt(0) && (
                          <Badge variant="outline" className="text-xs">
                            {formatWorkingTime(entry.workingTime)} worked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2">
                    {/* Check-in / Check-out times */}
                    {(entry.checkIn || entry.checkOut) && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {entry.checkIn && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Check In:{" "}
                            </span>
                            <span className="font-medium text-green-600">
                              {formatNsTime(entry.checkIn)}
                            </span>
                          </div>
                        )}
                        {entry.checkOut && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Check Out:{" "}
                            </span>
                            <span className="font-medium text-red-500">
                              {formatNsTime(entry.checkOut)}
                            </span>
                          </div>
                        )}
                        {entry.checkIn && !entry.checkOut && (
                          <Badge variant="secondary" className="text-xs">
                            Open — Not checked out
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Work Details / Note */}
                    {entry.note?.trim() && (
                      <div
                        className="bg-muted/50 rounded p-2"
                        data-ocid={`attendance-history.note.${idx + 1}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Work Details
                        </p>
                        <p className="text-sm">{entry.note}</p>
                      </div>
                    )}

                    {/* Non-working day message */}
                    {isNonWorking && !entry.note && (
                      <p className="text-xs text-muted-foreground italic">
                        {STATUS_LABELS[entry.status]} — no work hours recorded
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                data-ocid="attendance-history.pagination-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                data-ocid="attendance-history.pagination-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
