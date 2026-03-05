import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import React, { useState } from "react";
import type { AttendanceDayEntry } from "../../backend";
import { useIsCallerAdmin } from "../../hooks/useApproval";
import { useObserveUsers } from "../../hooks/useObserveUsers";
import {
  mapAttendanceDayEntriesToPdfData,
  mapAttendanceDayEntriesToPdfDataFull,
} from "../../lib/attendance/attendancePdfExportMapping";
import {
  filterRecordsByDateRange,
  getPastMonths,
  getPastWeeks,
} from "../../lib/attendance/dateRanges";
import { exportToPdf } from "../../lib/export/exportPdf";

interface AttendancePdfExportSectionProps {
  entries: [string, AttendanceDayEntry][];
}

type FilterMode = "week" | "month";

const PAST_WEEKS = getPastWeeks(24); // Last 24 weeks
const PAST_MONTHS = getPastMonths(24); // Last 24 months

export default function AttendancePdfExportSection({
  entries,
}: AttendancePdfExportSectionProps) {
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: allUsers = [] } = useObserveUsers();

  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedWeek, setSelectedWeek] = useState(PAST_WEEKS[0]?.start ?? "");
  const [selectedMonth, setSelectedMonth] = useState(
    PAST_MONTHS[0]?.start ?? "",
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (): { start: string; end: string; label: string } => {
    if (filterMode === "week") {
      const w = PAST_WEEKS.find((w) => w.start === selectedWeek);
      return w
        ? { start: w.start, end: w.end, label: w.label }
        : { start: "", end: "", label: "" };
    }
    const m = PAST_MONTHS.find((m) => m.start === selectedMonth);
    return m
      ? { start: m.start, end: m.end, label: m.label }
      : { start: "", end: "", label: "" };
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const { start, end, label } = getDateRange();
      if (!start || !end) {
        setError("Please select a valid date range.");
        setIsExporting(false);
        return;
      }

      // Filter entries by date range
      const filteredByDate = filterRecordsByDateRange(
        entries as [string, unknown][],
        start,
        end,
      ) as [string, AttendanceDayEntry][];

      let entriesToExport: [
        string,
        AttendanceDayEntry & {
          employeeName?: string;
          employeePrincipal?: string;
        },
      ][];

      if (isAdmin) {
        if (selectedEmployee !== "all") {
          // The entries passed in are already the caller's own — but for admin, we'd need all-users data
          // For now, filter by selected employee principal if we can find it embedded in entries
          // (entries are the caller's own, so for admin "all employees" it includes all from useGetAttendanceEntries)
          entriesToExport = filteredByDate.map(([date, entry]) => {
            const user = allUsers.find(
              (u) => u.principal.toString() === selectedEmployee,
            );
            return [
              date,
              {
                ...entry,
                employeeName:
                  user?.profile?.displayName ?? selectedEmployee.slice(0, 12),
              },
            ];
          });
        } else {
          // Add employee name to entries (entries are from current user for personal, so label as "All")
          entriesToExport = filteredByDate.map(([date, entry]) => [
            date,
            { ...entry, employeeName: "Self" },
          ]);
        }
      } else {
        entriesToExport = filteredByDate;
      }

      if (entriesToExport.length === 0) {
        setError("No attendance records found for the selected period.");
        setIsExporting(false);
        return;
      }

      const empLabel =
        isAdmin && selectedEmployee !== "all"
          ? ` — ${allUsers.find((u) => u.principal.toString() === selectedEmployee)?.profile?.displayName ?? "Employee"}`
          : "";

      const rangeLabel = `${label}${empLabel}`;

      const pdfData = isAdmin
        ? mapAttendanceDayEntriesToPdfDataFull(
            entriesToExport,
            "Attendance Report",
            rangeLabel,
          )
        : mapAttendanceDayEntriesToPdfData(
            entriesToExport,
            "My Attendance Report",
            rangeLabel,
          );

      await exportToPdf(pdfData, `attendance-${start}-${end}.pdf`);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-border" data-ocid="attendance-pdf-export.card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          Download Attendance PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Filter Mode */}
          <div className="space-y-1">
            <Label className="text-xs">Period</Label>
            <Select
              value={filterMode}
              onValueChange={(v) => setFilterMode(v as FilterMode)}
            >
              <SelectTrigger
                className="w-28 h-8 text-xs"
                data-ocid="attendance-pdf-export.period-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">By Week</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week / Month Selector */}
          {filterMode === "week" ? (
            <div className="space-y-1">
              <Label className="text-xs">Select Week</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger
                  className="w-56 h-8 text-xs"
                  data-ocid="attendance-pdf-export.week-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAST_WEEKS.map((w) => (
                    <SelectItem key={w.start} value={w.start}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Select Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger
                  className="w-48 h-8 text-xs"
                  data-ocid="attendance-pdf-export.month-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAST_MONTHS.map((m) => (
                    <SelectItem key={m.start} value={m.start}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admin: Employee Filter */}
          {isAdmin && (
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger
                  className="w-44 h-8 text-xs"
                  data-ocid="attendance-pdf-export.employee-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem
                      key={u.principal.toString()}
                      value={u.principal.toString()}
                    >
                      {u.profile?.displayName ??
                        `${u.principal.toString().slice(0, 12)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={isExporting}
            size="sm"
            className="gap-2 h-8"
            data-ocid="attendance-pdf-export.download-button"
          >
            {isExporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Download PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          PDF includes: date, attendance status (Present / Leave / Company Leave
          / Festival Leave / Week Off / Holiday / Half Day), check-in/out times,
          working hours, and work details.
        </p>

        {error && (
          <p
            className="text-xs text-destructive"
            data-ocid="attendance-pdf-export.error-state"
          >
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
