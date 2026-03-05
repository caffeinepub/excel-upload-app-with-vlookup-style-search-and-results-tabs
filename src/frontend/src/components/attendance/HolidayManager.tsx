import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Building2,
  Calendar,
  Globe,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Department, Holiday } from "../../backend";
import { useListDepartments } from "../../hooks/useDepartments";
import {
  useCreateHoliday,
  useDeleteHoliday,
  useIsCallerAdmin,
  useUpdateHoliday,
} from "../../hooks/useHolidays";

interface HolidayManagerProps {
  holidays: Holiday[];
  currentMonth: number; // 0-11
  currentYear: number;
}

const HOLIDAY_TYPE_OPTIONS = [
  { value: "Public", label: "Public Holiday" },
  { value: "Company", label: "Company Holiday" },
  { value: "Festival", label: "Festival" },
];

const HOLIDAY_TYPE_DISPLAY: Record<string, string> = {
  Public: "Public",
  Company: "Company",
  Festival: "Festival",
  festival: "Festival",
  companyLeave: "Company Leave",
};

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  Public: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  Company:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  Festival:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
  festival:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
  companyLeave:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
};

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

interface HolidayFormState {
  name: string;
  date: string;
  holidayType: string;
  applicableDepartments: bigint[];
  allDepartments: boolean;
  description: string;
}

const defaultForm: HolidayFormState = {
  name: "",
  date: "",
  holidayType: "Public",
  applicableDepartments: [],
  allDepartments: true,
  description: "",
};

function dateStringToTimestamp(dateStr: string): bigint {
  const d = new Date(`${dateStr}T00:00:00`);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

function timestampToDateString(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HolidayManager({
  holidays,
  currentMonth,
  currentYear,
}: HolidayManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState<HolidayFormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<bigint | null>(null);

  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: departments = [] } = useListDepartments();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  // Filter holidays for current month/year
  const monthHolidays = holidays
    .filter((h) => {
      const dateStr = timestampToDateString(h.date);
      const [y, m] = dateStr.split("-").map(Number);
      return y === currentYear && m === currentMonth + 1;
    })
    .sort((a, b) => Number(a.date - b.date));

  const openAddDialog = () => {
    setEditingHoliday(null);
    setForm(defaultForm);
    setError(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    const dateStr = timestampToDateString(holiday.date);
    setForm({
      name: holiday.name,
      date: dateStr,
      holidayType: holiday.holidayType,
      applicableDepartments: [...holiday.applicableDepartments],
      allDepartments: holiday.applicableDepartments.length === 0,
      description: holiday.description,
    });
    setError(null);
    setIsFormOpen(true);
  };

  const handleDepartmentToggle = (deptId: bigint, checked: boolean) => {
    setForm((prev) => {
      const current = prev.applicableDepartments;
      if (checked) {
        return { ...prev, applicableDepartments: [...current, deptId] };
      }
      return {
        ...prev,
        applicableDepartments: current.filter((id) => id !== deptId),
      };
    });
  };

  const handleAllDepartmentsToggle = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      allDepartments: checked,
      applicableDepartments: checked ? [] : prev.applicableDepartments,
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim()) {
      setError("Please enter a holiday name");
      return;
    }
    if (!form.date) {
      setError("Please select a date");
      return;
    }
    if (!form.holidayType) {
      setError("Please select a holiday type");
      return;
    }

    const dateTimestamp = dateStringToTimestamp(form.date);
    const depts = form.allDepartments ? [] : form.applicableDepartments;

    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({
          id: editingHoliday.id,
          name: form.name.trim(),
          date: dateTimestamp,
          holidayType: form.holidayType,
          applicableDepartments: depts,
          description: form.description.trim(),
        });
        toast.success("Holiday updated successfully");
      } else {
        await createHoliday.mutateAsync({
          name: form.name.trim(),
          date: dateTimestamp,
          holidayType: form.holidayType,
          applicableDepartments: depts,
          description: form.description.trim(),
        });
        toast.success("Holiday created successfully");
      }
      setIsFormOpen(false);
      setForm(defaultForm);
      setEditingHoliday(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save holiday";
      setError(message);
    }
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success("Holiday deleted successfully");
      setDeleteConfirmId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete holiday";
      toast.error(message);
    }
  };

  const getDeptName = (id: bigint): string => {
    const dept = departments.find((d: Department) => d.id === id);
    return dept ? dept.name : `Dept #${id}`;
  };

  const isPending = createHoliday.isPending || updateHoliday.isPending;

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
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Non-admin: read-only upcoming holidays view
  if (!isAdmin) {
    const upcomingHolidays = holidays
      .filter((h) => Number(h.date) / 1_000_000 >= Date.now())
      .sort((a, b) => Number(a.date - b.date))
      .slice(0, 20);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Holidays
          </CardTitle>
          <CardDescription>
            Company and public holidays for your reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingHolidays.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No upcoming holidays scheduled.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => (
                <div
                  key={String(holiday.id)}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {holiday.name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${HOLIDAY_TYPE_COLORS[holiday.holidayType] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {HOLIDAY_TYPE_DISPLAY[holiday.holidayType] ??
                          holiday.holidayType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDisplayDate(holiday.date)}
                    </p>
                    {holiday.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {holiday.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {holiday.applicableDepartments.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" /> All Departments
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {holiday.applicableDepartments
                            .map((id) => getDeptName(id))
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Admin: full CRUD view
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Holiday Management
              </CardTitle>
              <CardDescription>
                Manage holidays — {MONTH_NAMES[currentMonth]} {currentYear}
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Holiday
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monthHolidays.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No holidays defined for this month. Click "Add Holiday" to
                create one.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {monthHolidays.map((holiday) => (
                <div
                  key={String(holiday.id)}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {holiday.name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${HOLIDAY_TYPE_COLORS[holiday.holidayType] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {HOLIDAY_TYPE_DISPLAY[holiday.holidayType] ??
                          holiday.holidayType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDisplayDate(holiday.date)}
                    </p>
                    {holiday.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {holiday.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {holiday.applicableDepartments.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" /> All Departments
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {holiday.applicableDepartments
                            .map((id) => getDeptName(id))
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(holiday)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteConfirmId(holiday.id)}
                      disabled={deleteHoliday.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All upcoming holidays summary */}
      {holidays.filter((h) => Number(h.date) / 1_000_000 >= Date.now()).length >
        0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {holidays
                .filter((h) => Number(h.date) / 1_000_000 >= Date.now())
                .sort((a, b) => Number(a.date - b.date))
                .map((h) => (
                  <Badge
                    key={String(h.id)}
                    variant="outline"
                    className="text-xs"
                  >
                    {h.name} — {formatDisplayDate(h.date)}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday
                ? "Update the holiday details below."
                : "Create a new holiday visible to applicable departments."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name *</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. New Year's Day"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date *</Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-type">Holiday Type *</Label>
              <Select
                value={form.holidayType}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, holidayType: value }))
                }
              >
                <SelectTrigger id="holiday-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Applicable Departments</Label>
              <div className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-departments"
                    checked={form.allDepartments}
                    onCheckedChange={(checked) =>
                      handleAllDepartmentsToggle(!!checked)
                    }
                  />
                  <label
                    htmlFor="all-departments"
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    All Departments
                  </label>
                </div>
                {!form.allDepartments && (
                  <div className="pl-2 space-y-2 border-t pt-2 mt-2">
                    {departments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No departments available. Create departments first.
                      </p>
                    ) : (
                      departments.map((dept: Department) => (
                        <div
                          key={String(dept.id)}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={form.applicableDepartments.some(
                              (id) => id === dept.id,
                            )}
                            onCheckedChange={(checked) =>
                              handleDepartmentToggle(dept.id, !!checked)
                            }
                          />
                          <label
                            htmlFor={`dept-${dept.id}`}
                            className="text-sm cursor-pointer flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {dept.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-description">Description</Label>
              <Textarea
                id="holiday-description"
                placeholder="Optional description or notes about this holiday..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? editingHoliday
                  ? "Saving..."
                  : "Creating..."
                : editingHoliday
                  ? "Save Changes"
                  : "Create Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Holiday</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this holiday? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId !== null && handleDelete(deleteConfirmId)
              }
              disabled={deleteHoliday.isPending}
            >
              {deleteHoliday.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
