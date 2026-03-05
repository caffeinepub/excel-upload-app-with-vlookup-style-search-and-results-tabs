import type { Customer } from "@/backend";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ImportResult, useImportCustomers } from "@/hooks/useCustomers";
import {
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";

interface ParsedCustomer {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  company: string;
  workDetails: string;
}

// Map common column name variations to our fields
function normalizeKey(key: string): string {
  const k = key
    .toLowerCase()
    .trim()
    .replace(/[\s_\-]+/g, "");
  if (["name", "fullname", "customername", "clientname"].includes(k))
    return "name";
  if (["email", "emailaddress", "mail"].includes(k)) return "email";
  if (
    ["phone", "phonenumber", "mobile", "contact", "tel", "telephone"].includes(
      k,
    )
  )
    return "phoneNumber";
  if (["address", "addr", "location"].includes(k)) return "address";
  if (["company", "organization", "org", "business", "firm"].includes(k))
    return "company";
  if (
    [
      "workdetails",
      "work",
      "details",
      "notes",
      "description",
      "service",
    ].includes(k)
  )
    return "workDetails";
  return k;
}

type XLSXLib = {
  read: (
    data: ArrayBuffer,
    opts: { type: string },
  ) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (
      sheet: unknown,
      opts?: { header?: number; defval?: string },
    ) => Record<string, string>[];
  };
};

async function loadSheetJS(): Promise<XLSXLib> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w.XLSX) {
      resolve(w.XLSX as XLSXLib);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    script.onload = () =>
      resolve((window as unknown as Record<string, unknown>).XLSX as XLSXLib);
    script.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(script);
  });
}

async function parseExcel(file: File): Promise<ParsedCustomer[]> {
  const XLSX = await loadSheetJS();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  return rows
    .map((row) => {
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        mapped[normalizeKey(k)] = String(v);
      }
      return {
        name: mapped.name || "",
        email: mapped.email || "",
        phoneNumber: mapped.phoneNumber || "",
        address: mapped.address || "",
        company: mapped.company || "",
        workDetails: mapped.workDetails || "",
      };
    })
    .filter((c) => c.name.trim() !== "");
}

type PDFLib = {
  getDocument: (src: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
      }>;
    }>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

async function loadPDFJS(): Promise<PDFLib> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w.pdfjsLib) {
      resolve(w.pdfjsLib as PDFLib);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as unknown as Record<string, unknown>)
        .pdfjsLib as PDFLib;
      lib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

async function parsePDF(file: File): Promise<ParsedCustomer[]> {
  const pdfjsLib = await loadPDFJS();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let allText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    allText += `${content.items.map((item) => item.str).join(" ")}\n`;
  }

  const lines = allText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const customers: ParsedCustomer[] = [];

  // Attempt tabular parsing with header row detection
  let headerRow: string[] | null = null;
  for (const line of lines) {
    const parts = line
      .split(/[,\t|]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      if (!headerRow) {
        const normalized = parts.map(normalizeKey);
        if (
          normalized.some((k) => ["name", "email", "phoneNumber"].includes(k))
        ) {
          headerRow = normalized;
        }
      } else {
        const obj: Record<string, string> = {};
        headerRow.forEach((h, i) => {
          obj[h] = parts[i] || "";
        });
        const c: ParsedCustomer = {
          name: obj.name || "",
          email: obj.email || "",
          phoneNumber: obj.phoneNumber || "",
          address: obj.address || "",
          company: obj.company || "",
          workDetails: obj.workDetails || "",
        };
        if (c.name.trim()) customers.push(c);
      }
    }
  }

  // Fallback: key:value pairs
  if (customers.length === 0) {
    let current: Partial<ParsedCustomer> = {};
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const key = normalizeKey(match[1]);
        const val = match[2].trim();
        if (
          [
            "name",
            "email",
            "phoneNumber",
            "address",
            "company",
            "workDetails",
          ].includes(key)
        ) {
          (current as Record<string, string>)[key] = val;
        }
      } else if (Object.keys(current).length > 0) {
        if (current.name) {
          customers.push({
            name: current.name || "",
            email: current.email || "",
            phoneNumber: current.phoneNumber || "",
            address: current.address || "",
            company: current.company || "",
            workDetails: current.workDetails || "",
          });
        }
        current = {};
      }
    }
    if (current.name) {
      customers.push({
        name: current.name || "",
        email: current.email || "",
        phoneNumber: current.phoneNumber || "",
        address: current.address || "",
        company: current.company || "",
        workDetails: current.workDetails || "",
      });
    }
  }

  return customers;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCustomers: Customer[];
}

export default function CustomerImportDialog({
  open,
  onOpenChange,
  existingCustomers,
}: Props) {
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
  const [parseError, setParseError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportCustomers();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setParsedCustomers([]);
    setImportResult(null);
    setFileName(file.name);
    setIsParsing(true);

    try {
      let customers: ParsedCustomer[] = [];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        customers = await parseExcel(file);
      } else if (ext === "pdf") {
        customers = await parsePDF(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload .xlsx, .xls, .csv, or .pdf files.",
        );
      }

      if (customers.length === 0) {
        setParseError(
          "No customer records found in the file. Please check the file format and ensure it has a header row with columns like Name, Email, Phone, etc.",
        );
      } else {
        setParsedCustomers(customers);
      }
    } catch (err: unknown) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse file.",
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (parsedCustomers.length === 0) return;
    try {
      const result = await importMutation.mutateAsync({
        customers: parsedCustomers,
        existingCustomers,
      });
      setImportResult(result);
      setParsedCustomers([]);
      setFileName("");
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const handleClose = () => {
    setParsedCustomers([]);
    setParseError("");
    setFileName("");
    setImportResult(null);
    setIsParsing(false);
    onOpenChange(false);
  };

  // Identify duplicates
  const duplicateIndices = new Set<number>();
  parsedCustomers.forEach((c, i) => {
    const isDup = existingCustomers.some(
      (ex) =>
        (c.phoneNumber.trim() !== "" &&
          ex.phoneNumber === c.phoneNumber.trim()) ||
        (c.email.trim() !== "" && ex.email === c.email.trim()),
    );
    if (isDup) duplicateIndices.add(i);
  });

  const newCount = parsedCustomers.length - duplicateIndices.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Customers
          </DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx, .xls), CSV, or PDF file to import customer
            records. The file should have column headers like: Name, Email,
            Phone, Company, Address, Work Details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* File Upload Area */}
          {!importResult && (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
              }}
              aria-label="Upload file"
              // biome-ignore lint/a11y/useSemanticElements: file-input dropzone requires div wrapper
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex justify-center gap-3 mb-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <FileText className="w-8 h-8 text-red-500" />
              </div>
              {isParsing ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Parsing file...</span>
                </div>
              ) : fileName ? (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {fileName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Click to upload a file
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv, .pdf
                  </p>
                </>
              )}
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="w-4 h-4 text-green-600 inline mr-2" />
                <AlertDescription>
                  <span className="font-medium">Import complete!</span>{" "}
                  {importResult.successCount} customer
                  {importResult.successCount !== 1 ? "s" : ""} imported
                  successfully.
                  {importResult.duplicateCount > 0 && (
                    <span className="text-amber-600 ml-1">
                      {importResult.duplicateCount} duplicate
                      {importResult.duplicateCount !== 1 ? "s" : ""} skipped.
                    </span>
                  )}
                  {importResult.errors.length > 0 && (
                    <span className="text-destructive ml-1">
                      {importResult.errors.length} failed.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setImportResult(null);
                  setFileName("");
                }}
              >
                Import Another File
              </Button>
            </div>
          )}

          {/* Preview Table */}
          {parsedCustomers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Preview — {parsedCustomers.length} record
                  {parsedCustomers.length !== 1 ? "s" : ""} found
                </p>
                {duplicateIndices.size > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3" />
                    {duplicateIndices.size} duplicate
                    {duplicateIndices.size !== 1 ? "s" : ""} detected
                  </span>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Company</TableHead>
                      <TableHead className="text-xs">Address</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedCustomers.map((c, i) => (
                      <TableRow
                        // biome-ignore lint/suspicious/noArrayIndexKey: index-keyed positional list
                        key={i}
                        className={
                          duplicateIndices.has(i)
                            ? "bg-amber-50/50 dark:bg-amber-950/20"
                            : ""
                        }
                      >
                        <TableCell className="text-xs font-medium">
                          {c.name || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.phoneNumber || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.company || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">
                          {c.address || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {duplicateIndices.has(i) ? (
                            <span className="text-amber-600 font-medium">
                              Duplicate
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              New
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {duplicateIndices.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Records matching an existing phone number or email will be
                  skipped.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {parsedCustomers.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || newCount === 0}
              className="gap-2"
            >
              {importMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Import {newCount} Customer{newCount !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
