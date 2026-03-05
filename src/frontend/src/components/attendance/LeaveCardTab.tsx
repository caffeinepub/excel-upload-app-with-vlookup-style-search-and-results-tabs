import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  FileText,
  History,
  Loader2,
  PlusCircle,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AttendanceStatus } from "../../backend";
import { useEditAttendanceEntry } from "../../hooks/useAttendance";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../../hooks/useUserProfile";
import { loadLogoAsImage } from "../../lib/export/branding";
import { PDF_COMPANY_INFO } from "../../lib/export/pdfCompanyInfo";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaveType =
  | "Sick Leave"
  | "Casual Leave"
  | "Annual Leave"
  | "Festival Leave"
  | "Half Day"
  | "Company Leave"
  | "Other";

interface LeaveCardData {
  id: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  managerName: string;
  submittedAt: string;
  status: "Pending" | "Approved" | "Rejected";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWorkingDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return 0;
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function getLeaveStatus(leaveType: LeaveType): AttendanceStatus {
  switch (leaveType) {
    case "Festival Leave":
      return AttendanceStatus.festival;
    case "Half Day":
      return AttendanceStatus.halfDay;
    case "Company Leave":
      return AttendanceStatus.companyLeave;
    default:
      return AttendanceStatus.leave;
  }
}

function getDatesInRange(from: string, to: string): string[] {
  if (!from || !to) return [];
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getLocalStorageKey(principal: string) {
  return `leaveCards_${principal}`;
}

function loadLeaveCards(principal: string): LeaveCardData[] {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(principal));
    if (!raw) return [];
    return JSON.parse(raw) as LeaveCardData[];
  } catch {
    return [];
  }
}

function saveLeaveCards(principal: string, cards: LeaveCardData[]) {
  localStorage.setItem(getLocalStorageKey(principal), JSON.stringify(cards));
}

// ─── PDF Generation ────────────────────────────────────────────────────────────

interface jsPDFStatic {
  new (options?: object): jsPDFInstance;
}

interface jsPDFInstance {
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: object,
  ) => jsPDFInstance;
  addImage: (
    imageData: HTMLImageElement | string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => jsPDFInstance;
  setFontSize: (size: number) => jsPDFInstance;
  setFont: (fontName: string, fontStyle?: string) => jsPDFInstance;
  setTextColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setDrawColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setFillColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setLineWidth: (width: number) => jsPDFInstance;
  line: (x1: number, y1: number, x2: number, y2: number) => jsPDFInstance;
  rect: (
    x: number,
    y: number,
    width: number,
    height: number,
    style?: string,
  ) => jsPDFInstance;
  save: (filename: string) => void;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  internal: { pageSize: { width: number; height: number } };
}

let jsPDFLib: jsPDFStatic | null = null;

async function loadJsPDF(): Promise<jsPDFStatic> {
  if (jsPDFLib) return jsPDFLib;
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as Window & { jspdf?: { jsPDF: jsPDFStatic } }).jspdf?.jsPDF) {
      jsPDFLib = (window as Window & { jspdf?: { jsPDF: jsPDFStatic } }).jspdf!
        .jsPDF;
      resolve(jsPDFLib!);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      const w = window as Window & { jspdf?: { jsPDF: jsPDFStatic } };
      jsPDFLib = w.jspdf?.jsPDF ?? null;
      if (jsPDFLib) resolve(jsPDFLib);
      else reject(new Error("jsPDF not found after script load"));
    };
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(script);
  });
}

async function generateLeaveCardPdf(card: LeaveCardData) {
  const jsPDFClass = await loadJsPDF();
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const W = doc.internal.pageSize.width; // 210
  const H = doc.internal.pageSize.height; // 297
  const margin = 20;
  const contentW = W - 2 * margin;

  // ── Header ──────────────────────────────────────────────────────────────
  let y = margin;

  // Logo centered
  try {
    const logo = await loadLogoAsImage();
    const logoH = 18;
    const logoW = (logo.width / logo.height) * logoH;
    doc.addImage(logo, "PNG", (W - logoW) / 2, y, logoW, logoH);
    y += logoH + 4;
  } catch {
    y += 4;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("LEAVE APPLICATION FORM", W / 2, y, { align: "center" });
  y += 8;

  // Horizontal rule
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── Date of Application ─────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Date of Application: ${today}`, W - margin, y, { align: "right" });
  y += 8;

  // ── Fields Table ────────────────────────────────────────────────────────
  const colLeft = margin;
  const colMid = W / 2 + 4;
  const colW = contentW / 2 - 4;
  const rowH = 14;
  const labelFontSize = 8;
  const valueFontSize = 10;

  const drawField = (
    x: number,
    yPos: number,
    label: string,
    value: string,
    width: number = colW,
  ) => {
    // Label
    doc.setFontSize(labelFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), x, yPos);

    // Value
    doc.setFontSize(valueFontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value || "—", width - 2);
    doc.text(lines, x, yPos + 5);

    // Underline
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(x, yPos + rowH - 2, x + width - 2, yPos + rowH - 2);
  };

  // Row 1: Employee Name | Department
  drawField(colLeft, y, "Employee Name", card.employeeName);
  drawField(colMid, y, "Department", card.department);
  y += rowH + 2;

  // Row 2: Leave Type | Number of Days
  drawField(colLeft, y, "Leave Type", card.leaveType);
  drawField(colMid, y, "Number of Days", String(card.numberOfDays));
  y += rowH + 2;

  // Row 3: From Date | To Date
  drawField(colLeft, y, "From Date", card.fromDate);
  drawField(colMid, y, "To Date", card.toDate);
  y += rowH + 2;

  // Row 4: Manager Name (full width)
  drawField(colLeft, y, "Manager / Reporting To", card.managerName, contentW);
  y += rowH + 2;

  // Row 5: Reason (full width, taller)
  const reasonLabel = "Reason for Leave";
  doc.setFontSize(labelFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(reasonLabel.toUpperCase(), colLeft, y);
  y += 5;

  doc.setFontSize(valueFontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  const reasonLines = doc.splitTextToSize(card.reason || "—", contentW);
  doc.text(reasonLines, colLeft, y);
  y += Math.max(reasonLines.length * 5, 12);

  // Underline after reason
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(colLeft, y + 2, W - margin, y + 2);
  y += 12;

  // ── Signature Section ───────────────────────────────────────────────────
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);

  const sigW = contentW / 2 - 10;

  // Employee signature line
  doc.line(colLeft, y + 16, colLeft + sigW, y + 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Employee Signature", colLeft, y + 22);
  doc.text(`(${card.employeeName})`, colLeft, y + 27);

  // Manager approval line
  doc.line(colMid, y + 16, colMid + sigW, y + 16);
  doc.text("Manager Approval", colMid, y + 22);
  doc.text(`(${card.managerName || "___________"})`, colMid, y + 27);

  y += 35;

  // Status badge area
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(colLeft, y, 50, 10, "F");
  doc.setTextColor(50, 50, 50);
  doc.text(`Status: ${card.status}`, colLeft + 2, y + 7);

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = H - 22;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 2, W - margin, footerY - 2);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  const taglineLines = doc.splitTextToSize(
    PDF_COMPANY_INFO.footer.tagline,
    contentW,
  );
  doc.text(taglineLines, W / 2, footerY, { align: "center" });

  doc.setFont("helvetica", "normal");
  const contactLine = `${PDF_COMPANY_INFO.footer.website}  |  ${PDF_COMPANY_INFO.footer.email}  |  ${PDF_COMPANY_INFO.headerContact.phone}`;
  doc.text(contactLine, W / 2, footerY + 5, { align: "center" });

  const locLines = doc.splitTextToSize(
    PDF_COMPANY_INFO.footer.location,
    contentW,
  );
  doc.text(locLines, W / 2, footerY + 10, { align: "center" });

  // Save
  const safeName = card.employeeName.replace(/\s+/g, "-").toLowerCase();
  doc.save(`leave-card-${safeName}-${card.fromDate}.pdf`);
}

// ─── New Leave Card Form ───────────────────────────────────────────────────────

function NewLeaveCardForm({
  principal: _principal,
  onSave,
}: {
  principal: string;
  onSave: (card: LeaveCardData) => void;
}) {
  const { data: profile } = useGetCallerUserProfile();
  const editEntry = useEditAttendanceEntry();

  const [employeeName, setEmployeeName] = useState(profile?.displayName ?? "");
  const [department, setDepartment] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("Sick Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [managerName, setManagerName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill employee name from profile
  useEffect(() => {
    if (profile?.displayName && !employeeName) {
      setEmployeeName(profile.displayName);
    }
  }, [profile?.displayName, employeeName]);

  const numberOfDays = useMemo(
    () => countWorkingDays(fromDate, toDate),
    [fromDate, toDate],
  );

  const buildCard = (): LeaveCardData => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    employeeName,
    department,
    leaveType,
    fromDate,
    toDate,
    numberOfDays,
    reason,
    managerName,
    submittedAt: new Date().toISOString(),
    status: "Pending",
  });

  const validateForm = (): string | null => {
    if (!employeeName.trim()) return "Employee name is required.";
    if (!fromDate) return "From date is required.";
    if (!toDate) return "To date is required.";
    if (toDate < fromDate) return "To date must be on or after From date.";
    if (!reason.trim()) return "Reason is required.";
    return null;
  };

  const handlePreviewDownload = async () => {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setIsGenerating(true);
    try {
      await generateLeaveCardPdf(buildCard());
      toast.success("PDF downloaded successfully!");
    } catch (e) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setIsSubmitting(true);

    try {
      const card = buildCard();
      const leaveStatus = getLeaveStatus(leaveType);
      const dates = getDatesInRange(fromDate, toDate);

      // Save each date to attendance calendar
      await Promise.all(
        dates.map((date) =>
          editEntry.mutateAsync({
            date,
            entry: {
              status: leaveStatus,
              checkIn: undefined,
              checkOut: undefined,
              note: reason,
              workingTime: BigInt(0),
            },
          }),
        ),
      );

      // Save to localStorage history
      onSave(card);

      toast.success("Leave card submitted! Attendance calendar updated.");

      // Reset form
      setDepartment("");
      setLeaveType("Sick Leave");
      setFromDate("");
      setToDate("");
      setReason("");
      setManagerName("");
    } catch (e) {
      toast.error("Failed to submit leave card. Please try again.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusCircle className="h-4 w-4 text-primary" />
          New Leave Application
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employee Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="lc-emp-name"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Employee Name
            </Label>
            <Input
              id="lc-emp-name"
              tabIndex={0}
              placeholder="Your full name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              data-ocid="leave-card.employee_name.input"
            />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label
              htmlFor="lc-dept"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Department
            </Label>
            <Input
              id="lc-dept"
              tabIndex={0}
              placeholder="e.g. Research & Development"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Leave Type
            </Label>
            <Select
              value={leaveType}
              onValueChange={(v) => setLeaveType(v as LeaveType)}
            >
              <SelectTrigger
                tabIndex={0}
                data-ocid="leave-card.leave_type.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "Sick Leave",
                    "Casual Leave",
                    "Annual Leave",
                    "Festival Leave",
                    "Half Day",
                    "Company Leave",
                    "Other",
                  ] as LeaveType[]
                ).map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {lt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of Days (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Number of Working Days
            </Label>
            <Input
              tabIndex={-1}
              readOnly
              value={
                numberOfDays > 0
                  ? `${numberOfDays} day${numberOfDays !== 1 ? "s" : ""}`
                  : "—"
              }
              className="bg-muted/40 cursor-not-allowed"
            />
          </div>

          {/* From Date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="lc-from"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              From Date
            </Label>
            <Input
              id="lc-from"
              tabIndex={0}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              data-ocid="leave-card.from_date.input"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="lc-to"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              To Date
            </Label>
            <Input
              id="lc-to"
              tabIndex={0}
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              data-ocid="leave-card.to_date.input"
            />
          </div>

          {/* Manager Name */}
          <div className="space-y-1.5 md:col-span-2">
            <Label
              htmlFor="lc-mgr"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Manager / Reporting To
            </Label>
            <Input
              id="lc-mgr"
              tabIndex={0}
              placeholder="Manager's full name"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5 md:col-span-2">
            <Label
              htmlFor="lc-reason"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Reason for Leave
            </Label>
            <Textarea
              id="lc-reason"
              tabIndex={0}
              placeholder="Describe the reason for your leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePreviewDownload}
            disabled={isGenerating}
            className="gap-2"
            data-ocid="leave-card.download_button"
            tabIndex={0}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Preview & Download PDF
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || editEntry.isPending}
            className="gap-2"
            data-ocid="leave-card.submit_button"
            tabIndex={0}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Submit Leave Card
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Submitting will automatically update your attendance calendar for the
          selected dates. You can also download a PDF copy for your records.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── History View ──────────────────────────────────────────────────────────────

function LeaveCardHistory({
  cards,
  onDelete,
}: {
  cards: LeaveCardData[];
  onDelete: (id: string) => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (card: LeaveCardData) => {
    setDownloading(card.id);
    try {
      await generateLeaveCardPdf(card);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(null);
    }
  };

  if (cards.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-xl"
        data-ocid="leave-card.history.empty_state"
      >
        <History className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No leave cards submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table data-ocid="leave-card.history.table">
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Employee</TableHead>
            <TableHead className="text-xs">Leave Type</TableHead>
            <TableHead className="text-xs">From</TableHead>
            <TableHead className="text-xs">To</TableHead>
            <TableHead className="text-xs">Days</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Submitted</TableHead>
            <TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card, idx) => (
            <TableRow
              key={card.id}
              data-ocid={`leave-card.history.row.${idx + 1}`}
            >
              <TableCell className="text-sm font-medium">
                {card.employeeName}
              </TableCell>
              <TableCell className="text-sm">{card.leaveType}</TableCell>
              <TableCell className="text-sm">{card.fromDate}</TableCell>
              <TableCell className="text-sm">{card.toDate}</TableCell>
              <TableCell className="text-sm">{card.numberOfDays}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    card.status === "Approved"
                      ? "default"
                      : card.status === "Rejected"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {card.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(card.submittedAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(card)}
                    disabled={downloading === card.id}
                    title="Download PDF"
                  >
                    {downloading === card.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(card.id)}
                    title="Delete"
                    data-ocid={`leave-card.history.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LeaveCardTab() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";

  const [cards, setCards] = useState<LeaveCardData[]>(() =>
    principal ? loadLeaveCards(principal) : [],
  );

  // Load cards when principal changes
  useEffect(() => {
    if (principal) {
      setCards(loadLeaveCards(principal));
    }
  }, [principal]);

  const handleSave = (card: LeaveCardData) => {
    const updated = [card, ...cards];
    setCards(updated);
    if (principal) saveLeaveCards(principal, updated);
  };

  const handleDelete = (id: string) => {
    const updated = cards.filter((c) => c.id !== id);
    setCards(updated);
    if (principal) saveLeaveCards(principal, updated);
    toast.success("Leave card removed from history.");
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="new">
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="new" className="gap-1.5 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            New Leave Card
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            History
            {cards.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5">
                {cards.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <NewLeaveCardForm principal={principal} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <LeaveCardHistory cards={cards} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
