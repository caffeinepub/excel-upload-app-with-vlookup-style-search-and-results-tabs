import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus, Trash2, Calendar } from 'lucide-react';
import { HolidayType } from '../../backend';
import type { HolidayEntry } from '../../backend';
import { useCreateHoliday, useDeleteHoliday, useIsCallerAdmin } from '../../hooks/useHolidays';
import { toast } from 'sonner';

interface HolidayManagerProps {
  holidays: HolidayEntry[];
  currentMonth: number; // 0-11
  currentYear: number;
}

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  [HolidayType.festival]: 'Festival',
  [HolidayType.companyLeave]: 'Company Leave',
};

export function HolidayManager({ holidays, currentMonth, currentYear }: HolidayManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<HolidayType>(HolidayType.festival);
  const [error, setError] = useState<string | null>(null);

  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  // Filter holidays for current month
  const monthHolidays = holidays.filter(h => {
    const [year, month] = h.date.split('-').map(Number);
    return year === currentYear && month === currentMonth + 1;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const handleAddHoliday = async () => {
    setError(null);

    if (!newDate) {
      setError('Please select a date');
      return;
    }

    try {
      await createHoliday.mutateAsync({ date: newDate, holidayType: newType });
      toast.success('Holiday added successfully');
      setIsAddDialogOpen(false);
      setNewDate('');
      setNewType(HolidayType.festival);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add holiday';
      setError(message);
      toast.error(message);
    }
  };

  const handleDeleteHoliday = async (date: string) => {
    try {
      await deleteHoliday.mutateAsync(date);
      toast.success('Holiday deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete holiday';
      toast.error(message);
    }
  };

  if (isAdminLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holiday Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holiday Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only administrators can manage global holidays. Please contact your admin to add or modify holidays.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Holiday Management
        </CardTitle>
        <CardDescription>
          Manage global holidays for all users (Admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Holiday Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Holiday</DialogTitle>
              <DialogDescription>
                Create a global holiday that will be visible to all users
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holiday-type">Type</Label>
                <Select value={newType} onValueChange={(value) => setNewType(value as HolidayType)}>
                  <SelectTrigger id="holiday-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HOLIDAY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHoliday} disabled={createHoliday.isPending}>
                {createHoliday.isPending ? 'Adding...' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Holidays List */}
        {monthHolidays.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No holidays defined for this month. Add holidays to mark festival days and company leave.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthHolidays.map((holiday) => {
                  const displayDate = new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <TableRow key={holiday.date}>
                      <TableCell>{displayDate}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          holiday.holidayType === HolidayType.festival
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                        }`}>
                          {HOLIDAY_TYPE_LABELS[holiday.holidayType]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteHoliday(holiday.date)}
                          disabled={deleteHoliday.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
