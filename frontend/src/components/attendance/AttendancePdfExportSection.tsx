import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, AlertCircle, FileText } from 'lucide-react';
import { useGetAttendanceSummary } from '../../hooks/useAttendance';
import { getCurrentWeekRange, getCurrentMonthRange, getCurrentYearRange } from '../../lib/attendance/dateRanges';
import { mapAttendanceSummaryToExportData, generateAttendanceFilename } from '../../lib/attendance/attendancePdfExportMapping';
import { exportToPdf } from '../../lib/export/exportPdf';
import { toast } from 'sonner';

type RangeType = 'week' | 'month' | 'year';

export function AttendancePdfExportSection() {
  const [selectedRange, setSelectedRange] = useState<RangeType>('week');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange: [string, string] = 
    selectedRange === 'week' ? getCurrentWeekRange() :
    selectedRange === 'month' ? getCurrentMonthRange() :
    getCurrentYearRange();

  const { data: summary, isLoading } = useGetAttendanceSummary(dateRange);

  const handleExport = async () => {
    setError(null);

    if (!summary) {
      setError('No attendance data available');
      return;
    }

    if (summary.totalDays === BigInt(0)) {
      setError('No attendance data for the selected period');
      return;
    }

    setIsExporting(true);

    try {
      const exportData = mapAttendanceSummaryToExportData(
        summary,
        selectedRange,
        dateRange[0],
        dateRange[1]
      );

      const filename = generateAttendanceFilename(selectedRange, dateRange[0], dateRange[1]);

      await exportToPdf(exportData, filename);
      toast.success('Attendance report exported successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export attendance report';
      setError(message);
      toast.error(message);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = !isLoading && summary && summary.totalDays > BigInt(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Export Attendance Report
        </CardTitle>
        <CardDescription>Download detailed attendance report as PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedRange} onValueChange={(value) => setSelectedRange(value as RangeType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className="sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading attendance data...</p>
        )}

        {!isLoading && summary && summary.totalDays === BigInt(0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No attendance data available for the selected period
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && summary && summary.totalDays > BigInt(0) && (
          <div className="text-sm text-muted-foreground">
            <p>Period: {dateRange[0]} to {dateRange[1]}</p>
            <p>Total days: {Number(summary.totalDays)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
