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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  Calendar,
  CalendarMinus,
  CalendarPlus,
  CheckCircle,
  ClipboardList,
  Clock,
  Crown,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApprovalStatus, AttendanceStatus } from "../backend";
import type { AttendanceDayEntry } from "../backend";
import { useActor } from "../hooks/useActor";
import { useGetAllUsersForAdmin, useIsCallerAdmin } from "../hooks/useApproval";
import {
  useGrantAdminRole,
  useRemoveUserCompletely,
  useSetApproval,
} from "../hooks/useApprovalMutations";
import {
  useGrantCustomDatePermission,
  useRevokeCustomDatePermission,
} from "../hooks/useAttendance";
import { useGetAllUsers } from "../hooks/useTeamMessaging";
import { getUserFriendlyError } from "../utils/errors/userFriendlyError";

// ── Types ──────────────────────────────────────────────────────────────────────

type LeaveCardData = {
  id: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  managerName: string;
  submittedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  submitterPrincipal?: string;
};

function loadAllLeaveCards(): LeaveCardData[] {
  const cards: LeaveCardData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("leaveCards_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as LeaveCardData[];
          const principal = key.replace("leaveCards_", "");
          cards.push(
            ...parsed.map((c) => ({ ...c, submitterPrincipal: principal })),
          );
        }
      }
    }
  } catch {
    // ignore
  }
  return cards;
}

function updateLeaveCardStatus(
  submitterPrincipal: string,
  cardId: string,
  status: "Approved" | "Rejected",
) {
  const key = `leaveCards_${submitterPrincipal}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const cards = JSON.parse(raw) as LeaveCardData[];
    const updated = cards.map((c) => (c.id === cardId ? { ...c, status } : c));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ── Admin Leave Cards Panel ────────────────────────────────────────────────────

function AdminLeaveCardsPanel() {
  const [cards, setCards] = useState<LeaveCardData[]>(() =>
    loadAllLeaveCards(),
  );
  const [processing, setProcessing] = useState<string | null>(null);

  const pendingCards = cards.filter((c) => c.status === "Pending");
  const historicCards = cards.filter((c) => c.status !== "Pending");

  const refresh = () => setCards(loadAllLeaveCards());

  const handleApprove = async (card: LeaveCardData) => {
    if (!card.submitterPrincipal) return;
    setProcessing(card.id);
    try {
      updateLeaveCardStatus(card.submitterPrincipal, card.id, "Approved");
      refresh();
      toast.success(`Leave approved for ${card.employeeName}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (card: LeaveCardData) => {
    if (!card.submitterPrincipal) return;
    setProcessing(card.id);
    try {
      updateLeaveCardStatus(card.submitterPrincipal, card.id, "Rejected");
      refresh();
      toast.success(`Leave rejected for ${card.employeeName}`);
    } finally {
      setProcessing(null);
    }
  };

  if (cards.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-xl"
        data-ocid="admin.leave-cards.empty_state"
      >
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No leave card submissions yet.
        </p>
      </div>
    );
  }

  const renderTable = (items: LeaveCardData[], showActions: boolean) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Employee</TableHead>
            <TableHead className="text-xs">Leave Type</TableHead>
            <TableHead className="text-xs">From</TableHead>
            <TableHead className="text-xs">To</TableHead>
            <TableHead className="text-xs">Days</TableHead>
            <TableHead className="text-xs">Reason</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            {showActions && (
              <TableHead className="text-xs text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((card, idx) => (
            <TableRow
              key={card.id}
              data-ocid={`admin.leave-card.row.${idx + 1}`}
            >
              <TableCell className="text-sm font-medium">
                {card.employeeName}
              </TableCell>
              <TableCell className="text-sm">{card.leaveType}</TableCell>
              <TableCell className="text-sm">{card.fromDate}</TableCell>
              <TableCell className="text-sm">{card.toDate}</TableCell>
              <TableCell className="text-sm">{card.numberOfDays}</TableCell>
              <TableCell className="text-sm max-w-xs truncate">
                {card.reason}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    card.status === "Approved"
                      ? "default"
                      : card.status === "Rejected"
                        ? "destructive"
                        : "secondary"
                  }
                  className={`text-xs ${card.status === "Approved" ? "bg-green-500" : ""}`}
                >
                  {card.status}
                </Badge>
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(card)}
                      disabled={processing === card.id}
                      data-ocid={`admin.leave-card.confirm_button.${idx + 1}`}
                    >
                      {processing === card.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => handleReject(card)}
                      disabled={processing === card.id}
                      data-ocid={`admin.leave-card.cancel_button.${idx + 1}`}
                    >
                      {processing === card.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending Approvals
          {pendingCards.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCards.length}
            </Badge>
          )}
        </h3>
        {pendingCards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pending leave requests
          </p>
        ) : (
          renderTable(pendingCards, true)
        )}
      </div>

      {historicCards.length > 0 && (
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            History
          </h3>
          {renderTable(historicCards, false)}
        </div>
      )}
    </div>
  );
}

// Status label/color helpers for attendance
const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  [AttendanceStatus.present]: "Present",
  [AttendanceStatus.leave]: "Leave",
  [AttendanceStatus.halfDay]: "Half Day",
  [AttendanceStatus.weeklyOff]: "Weekly Off",
  [AttendanceStatus.festival]: "Festival Leave",
  [AttendanceStatus.companyLeave]: "Company Leave",
  [AttendanceStatus.holiday]: "Holiday",
};

function formatNsTimeAdmin(ns?: bigint): string {
  if (!ns) return "—";
  return new Date(Number(ns) / 1_000_000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWorkingTimeAdmin(seconds: bigint): string {
  const s = Number(seconds);
  if (s === 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Admin Employee Attendance Panel ───────────────────────────────────────────

function AdminEmployeeAttendancePanel() {
  const { data: allUsers = [], isLoading: usersLoading } = useGetAllUsers();
  const { actor } = useActor();
  const [selectedPrincipal, setSelectedPrincipal] = useState<string>("");
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<
    Array<[string, AttendanceDayEntry]>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async (principalStr: string) => {
    if (!principalStr || !actor) return;
    setIsLoading(true);
    setError(null);
    setAttendanceData([]);
    try {
      const { Principal } = await import("@dfinity/principal");
      const principal = Principal.fromText(principalStr);
      const entries = await actor.getEmployeeAttendanceDayEntries(principal);
      const sorted = [...entries].sort(([a], [b]) => b.localeCompare(a));
      setAttendanceData(sorted);
      if (sorted.length === 0) {
        setError("No attendance records found for this employee.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch attendance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (attendanceData.length === 0) return;
    setIsDownloading(true);
    try {
      const { mapAttendanceDayEntriesToPdfDataFull } = await import(
        "../lib/attendance/attendancePdfExportMapping"
      );
      const { exportToPdf } = await import("../lib/export/exportPdf");

      const enriched: Array<
        [string, AttendanceDayEntry & { employeeName?: string }]
      > = attendanceData.map(([date, entry]) => [
        date,
        { ...entry, employeeName: selectedDisplayName },
      ]);

      const pdfData = mapAttendanceDayEntriesToPdfDataFull(
        enriched,
        `Attendance Report — ${selectedDisplayName}`,
        "Full History",
      );
      await exportToPdf(
        pdfData,
        `attendance-${selectedDisplayName.replace(/\s+/g, "-")}.pdf`,
      );
      toast.success("PDF downloaded successfully");
    } catch (e) {
      toast.error(`Failed to generate PDF: ${getUserFriendlyError(e)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-48">
          <label
            htmlFor="admin-employee-select"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Select Employee
          </label>
          {usersLoading ? (
            <div className="h-9 bg-muted rounded-md animate-pulse" />
          ) : (
            <Select
              value={selectedPrincipal}
              onValueChange={(v) => {
                setSelectedPrincipal(v);
                const user = allUsers.find((u) => u.principalStr === v);
                setSelectedDisplayName(
                  user?.displayName || `User-${v.slice(-4).toUpperCase()}`,
                );
                void fetchAttendance(v);
              }}
            >
              <SelectTrigger
                id="admin-employee-select"
                className="h-9"
                data-ocid="admin.employee-attendance.select"
              >
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.principalStr} value={u.principalStr}>
                    {u.displayName ||
                      `User-${u.principalStr.slice(-4).toUpperCase()}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {selectedPrincipal && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9"
              onClick={() => void fetchAttendance(selectedPrincipal)}
              disabled={isLoading}
              data-ocid="admin.employee-attendance.button"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
            {attendanceData.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="gap-2 h-9"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                data-ocid="admin.employee-attendance.download_button"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download PDF
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div
          className="flex items-center justify-center py-8 gap-2"
          data-ocid="admin.employee-attendance.loading_state"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading attendance records...
          </span>
        </div>
      )}

      {!isLoading && attendanceData.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {attendanceData.length} records for{" "}
            <strong>{selectedDisplayName}</strong>
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table data-ocid="admin.employee-attendance.table">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Check In</TableHead>
                  <TableHead className="text-xs">Check Out</TableHead>
                  <TableHead className="text-xs">Working Time</TableHead>
                  <TableHead className="text-xs">Work Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map(([date, entry], idx) => (
                  <TableRow
                    key={date}
                    data-ocid={`admin.employee-attendance.row.${idx + 1}`}
                  >
                    <TableCell className="text-sm font-mono">{date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ATTENDANCE_STATUS_LABELS[entry.status] ?? entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatNsTimeAdmin(entry.checkIn)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatNsTimeAdmin(entry.checkOut)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatWorkingTimeAdmin(entry.workingTime)}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {entry.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && !selectedPrincipal && (
        <div
          className="flex flex-col items-center justify-center py-10 gap-2 text-center"
          data-ocid="admin.employee-attendance.empty_state"
        >
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Select an employee to view their full attendance records
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminUsersTab() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const {
    data: allUsers = [],
    isLoading: approvalsLoading,
    refetch,
  } = useGetAllUsersForAdmin();
  const setApprovalMutation = useSetApproval();
  const removeUserMutation = useRemoveUserCompletely();
  const grantPermission = useGrantCustomDatePermission();
  const revokePermission = useRevokeCustomDatePermission();
  const grantAdminRoleMutation = useGrantAdminRole();

  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track which users have been granted custom date permission
  // Key: principalStr, Value: true = granted, false = revoked
  const [userDatePermissions, setUserDatePermissions] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const stored = localStorage.getItem("userDatePermissions");
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const saveUserDatePermissions = (perms: Record<string, boolean>) => {
    setUserDatePermissions(perms);
    try {
      localStorage.setItem("userDatePermissions", JSON.stringify(perms));
    } catch {
      // ignore
    }
  };

  // Auto-refresh every 8 seconds to pick up new requests
  useEffect(() => {
    const interval = setInterval(() => {
      void refetch();
    }, 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("User list refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (principal: Principal) => {
    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await setApprovalMutation.mutateAsync({
        user: principal,
        status: ApprovalStatus.approved,
      });
      await refetch();
      toast.success("User approved — they can now access the app");
    } catch (error) {
      console.error("Failed to approve user:", error);
      const msg = getUserFriendlyError(error);
      setActionError(msg);
      toast.error(`Failed to approve user: ${msg}`);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleReject = async (principal: Principal) => {
    if (!confirm("Are you sure you want to reject this user?")) return;

    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await setApprovalMutation.mutateAsync({
        user: principal,
        status: ApprovalStatus.rejected,
      });
      await refetch();
      toast.success("User rejected");
    } catch (error) {
      console.error("Failed to reject user:", error);
      const msg = getUserFriendlyError(error);
      setActionError(msg);
      toast.error(`Failed to reject user: ${msg}`);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleGrantCustomDatePermission = async (principal: Principal) => {
    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await grantPermission.mutateAsync(principal);
      saveUserDatePermissions({
        ...userDatePermissions,
        [principalStr]: true,
      });
      toast.success(
        "Date access granted — user can now edit past/future attendance",
      );
    } catch (error) {
      console.error("Failed to grant permission:", error);
      const message = getUserFriendlyError(error);
      setActionError(message);
      toast.error(`Failed to grant date access: ${message}`);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRevokeCustomDatePermission = async (principal: Principal) => {
    if (
      !confirm(
        "Are you sure you want to revoke custom date permission for this user?",
      )
    )
      return;

    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await revokePermission.mutateAsync(principal);
      saveUserDatePermissions({
        ...userDatePermissions,
        [principalStr]: false,
      });
      toast.success(
        "Date access revoked — user can no longer edit past/future attendance",
      );
    } catch (error) {
      console.error("Failed to revoke permission:", error);
      const message = getUserFriendlyError(error);
      setActionError(message);
      toast.error(`Failed to revoke date access: ${message}`);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async (principal: Principal) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this user? This cannot be undone.",
      )
    )
      return;

    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await removeUserMutation.mutateAsync(principal);
      await refetch();
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Failed to delete user:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      setActionError(message);
      toast.error(message);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleGrantAdminRole = async (principal: Principal) => {
    if (
      !confirm(
        "Are you sure you want to grant ADMIN role to this user? They will have full admin privileges.",
      )
    )
      return;

    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await grantAdminRoleMutation.mutateAsync(principal);
      // Also approve them in the approval system
      await setApprovalMutation.mutateAsync({
        user: principal,
        status: ApprovalStatus.approved,
      });
      await refetch();
      toast.success("Admin role granted — this user is now an administrator");
    } catch (error) {
      console.error("Failed to grant admin role:", error);
      const message =
        error instanceof Error ? error.message : "Failed to grant admin role";
      setActionError(message);
      toast.error(message);
    } finally {
      setProcessingUser(null);
    }
  };

  if (adminLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.approved:
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case ApprovalStatus.rejected:
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case ApprovalStatus.pending:
        return (
          <Badge className="bg-amber-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const pendingCount = allUsers.filter(
    (u) => u.status === ApprovalStatus.pending,
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, attendance, and leave requests
          </p>
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive" data-ocid="admin.users.error_state">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" data-ocid="admin.panel.tabs">
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger
            value="users"
            className="gap-1.5 text-xs"
            data-ocid="admin.users.tab"
          >
            <Users className="h-3.5 w-3.5" />
            User Management
            {pendingCount > 0 && (
              <Badge
                variant="secondary"
                className="text-xs h-4 px-1.5 ml-1 bg-amber-500 text-white"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="gap-1.5 text-xs"
            data-ocid="admin.attendance.tab"
          >
            <Calendar className="h-3.5 w-3.5" />
            Employee Attendance
          </TabsTrigger>
          <TabsTrigger
            value="leave-cards"
            className="gap-1.5 text-xs"
            data-ocid="admin.leave-cards.tab"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Leave Approvals
            {(() => {
              const pending = loadAllLeaveCards().filter(
                (c) => c.status === "Pending",
              ).length;
              return pending > 0 ? (
                <Badge variant="secondary" className="text-xs h-4 px-1.5 ml-1">
                  {pending}
                </Badge>
              ) : null;
            })()}
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ───────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl">All Users</CardTitle>
                  <CardDescription className="mt-0.5">
                    {allUsers.length} {allUsers.length === 1 ? "user" : "users"}{" "}
                    registered
                    {pendingCount > 0 && (
                      <span className="ml-2 text-amber-600 font-semibold">
                        · {pendingCount} pending approval
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => void handleManualRefresh()}
                  disabled={isRefreshing || approvalsLoading}
                  data-ocid="admin.users.button"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {approvalsLoading ? (
                <div
                  className="flex items-center justify-center py-10 gap-2"
                  data-ocid="admin.users.loading_state"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading users…</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-border rounded-xl"
                  data-ocid="admin.users.empty_state"
                >
                  <Users className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    No users found.
                    <br />
                    New users will appear here after they log in and request
                    access.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleManualRefresh()}
                    data-ocid="admin.users.secondary_button"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check for New Requests
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="admin.users.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">User</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user, idx) => {
                        const principalStr = user.principal.toString();
                        const isProcessing = processingUser === principalStr;
                        const displayName =
                          user.displayName ||
                          `User-${principalStr.slice(-6).toUpperCase()}`;
                        const isApproved =
                          user.status === ApprovalStatus.approved;
                        const isRejected =
                          user.status === ApprovalStatus.rejected;

                        return (
                          <TableRow
                            key={principalStr}
                            data-ocid={`admin.users.row.${idx + 1}`}
                            className={
                              user.status === ApprovalStatus.pending
                                ? "bg-amber-50/40 dark:bg-amber-950/20"
                                : ""
                            }
                          >
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm">
                                  {displayName}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {principalStr.slice(0, 18)}…
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(user.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap items-center">
                                {/* Approve — shown for pending/rejected */}
                                {!isApproved && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                    onClick={() =>
                                      void handleApprove(user.principal)
                                    }
                                    disabled={isProcessing}
                                    data-ocid={`admin.users.confirm_button.${idx + 1}`}
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                    Approve
                                  </Button>
                                )}

                                {/* Reject — shown for pending/approved */}
                                {!isRejected && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs gap-1"
                                    onClick={() =>
                                      void handleReject(user.principal)
                                    }
                                    disabled={isProcessing}
                                    data-ocid={`admin.users.cancel_button.${idx + 1}`}
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    Reject
                                  </Button>
                                )}

                                {/* Make Admin — hidden in 3-dot dropdown */}
                                {isApproved && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        disabled={isProcessing}
                                        data-ocid={`admin.users.dropdown_menu.${idx + 1}`}
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-purple-700 dark:text-purple-400 gap-2 cursor-pointer"
                                        onClick={() =>
                                          void handleGrantAdminRole(
                                            user.principal,
                                          )
                                        }
                                      >
                                        <Crown className="h-3.5 w-3.5" />
                                        Make Admin
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}

                                {/* Grant / Revoke Date Access — toggle based on current permission state */}
                                {userDatePermissions[principalStr] === true ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                                    onClick={() =>
                                      void handleRevokeCustomDatePermission(
                                        user.principal,
                                      )
                                    }
                                    disabled={isProcessing}
                                    title="Remove this user's permission to edit past/future attendance"
                                    data-ocid={`admin.users.save_button.${idx + 1}`}
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CalendarMinus className="h-3 w-3" />
                                    )}
                                    Revoke Date Access
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                                    onClick={() =>
                                      void handleGrantCustomDatePermission(
                                        user.principal,
                                      )
                                    }
                                    disabled={isProcessing}
                                    title="Allow this user to edit past/future attendance dates"
                                    data-ocid={`admin.users.edit_button.${idx + 1}`}
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CalendarPlus className="h-3 w-3" />
                                    )}
                                    Grant Date Access
                                  </Button>
                                )}

                                {/* Delete — always shown */}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs gap-1 bg-red-700 hover:bg-red-800"
                                  onClick={() =>
                                    void handleDeleteUser(user.principal)
                                  }
                                  disabled={isProcessing}
                                  title="Permanently delete this user from the system"
                                  data-ocid={`admin.users.delete_button.${idx + 1}`}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                  Delete
                                </Button>
                              </div>
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

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Make Admin:</strong> Promotes an approved user to full
              Administrator role with all admin privileges.{" "}
              <strong>Grant Date Access:</strong> Allows a user to create and
              edit attendance entries for any past or future date.{" "}
              <strong>Revoke Date Access:</strong> Restricts them back to
              today-only editing. <strong>Delete:</strong> Permanently removes
              the user from the system.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ── Attendance Tab ──────────────────────────────────── */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                View Employee Attendance
              </CardTitle>
              <CardDescription>
                Select an employee to view their attendance history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminEmployeeAttendancePanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leave Cards Tab ─────────────────────────────────── */}
        <TabsContent value="leave-cards" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Leave Card Approvals
              </CardTitle>
              <CardDescription>
                Review, approve, or reject employee leave applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLeaveCardsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
