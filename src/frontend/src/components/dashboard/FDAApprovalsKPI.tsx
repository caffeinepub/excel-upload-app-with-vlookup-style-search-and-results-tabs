import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pill,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface FDADrug {
  application_number: string;
  sponsor_name: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
  submissions?: {
    submission_status_date?: string;
    submission_status?: string;
    submission_type?: string;
    submission_number?: string;
  }[];
}

function formatDate(raw?: string): string {
  if (!raw || raw.length < 8) return "";
  const year = raw.slice(0, 4);
  const month = Number.parseInt(raw.slice(4, 6), 10) - 1;
  const day = raw.slice(6, 8);
  const d = new Date(Number(year), month, Number(day));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLatestApproval(drug: FDADrug): string {
  const approved = (drug.submissions ?? [])
    .filter((s) => s.submission_status === "AP")
    .sort((a, b) =>
      (b.submission_status_date ?? "").localeCompare(
        a.submission_status_date ?? "",
      ),
    );
  return formatDate(approved[0]?.submission_status_date);
}

function getDrugName(drug: FDADrug): string {
  return (
    drug.openfda?.brand_name?.[0] ??
    drug.openfda?.generic_name?.[0] ??
    drug.application_number
  );
}

function getGenericName(drug: FDADrug): string {
  return drug.openfda?.generic_name?.[0] ?? "";
}

function getSponsor(drug: FDADrug): string {
  return drug.openfda?.manufacturer_name?.[0] ?? drug.sponsor_name ?? "";
}

async function fetchFDAApprovals(): Promise<FDADrug[]> {
  // Query NDA/BLA approvals — no nested sort (not supported by FDA API)
  // Use a recent date range to get fresh data
  const url =
    "https://api.fda.gov/drug/drugsfda.json?search=submissions.submission_status%3A%22AP%22+AND+(application_number:NDA*+application_number:BLA*)&limit=20";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FDA API error: ${res.status}`);
  const data = await res.json();
  const all: FDADrug[] = data?.results ?? [];
  // Sort client-side by latest AP submission date descending
  const sorted = all
    .map((d) => ({
      drug: d,
      date:
        (d.submissions ?? [])
          .filter((s) => s.submission_status === "AP")
          .map((s) => s.submission_status_date ?? "")
          .sort()
          .pop() ?? "",
    }))
    .filter((x) => x.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((x) => x.drug);
  return sorted.length > 0 ? sorted : all.slice(0, 10);
}

export default function FDAApprovalsKPI() {
  const [drugs, setDrugs] = useState<FDADrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFDAApprovals()
      .then((results) => {
        setDrugs(results);
        setLoading(false);
        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 12 * 60 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    if (drugs.length === 0) return;
    setCurrent(0);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % drugs.length);
      setProgress(0);
    }, 5000);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [drugs]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % drugs.length);
      setProgress(0);
    }, 5000);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, 100);
  };

  const drug = drugs[current];
  const appNo = drug?.application_number ?? "";
  const labelUrl = `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${appNo.replace(/^[A-Z]+/, "")}`;

  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-mac-soft flex flex-col overflow-hidden"
      data-ocid="fda_kpi.card"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Pill className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1">
          Latest FDA Approvals
        </span>
        <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Live
        </span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-2 min-h-[150px] justify-center">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        {!loading && error && (
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Unable to load FDA data.
            </p>
            <button
              type="button"
              onClick={load}
              className="text-xs text-primary underline"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && drugs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            No approval data found.
          </p>
        )}
        {!loading && !error && drug && (
          <div className="space-y-2">
            <a
              href={labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1 group"
            >
              <span className="text-sm font-bold text-primary leading-tight group-hover:underline">
                {getDrugName(drug)}
              </span>
              <ExternalLink className="h-3 w-3 text-primary flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
            </a>
            {getGenericName(drug) &&
              getDrugName(drug) !== getGenericName(drug) && (
                <p className="text-xs text-muted-foreground italic">
                  {getGenericName(drug)}
                </p>
              )}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Badge variant="secondary" className="text-[10px]">
                {appNo}
              </Badge>
              {getSponsor(drug) && (
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {getSponsor(drug)}
                </span>
              )}
            </div>
            {getLatestApproval(drug) && (
              <div className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[11px] text-muted-foreground">
                  Approved:{" "}
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {getLatestApproval(drug)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && !error && drugs.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goTo((current - 1 + drugs.length) % drugs.length)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-muted-foreground">
              {current + 1} / {drugs.length}
              {lastUpdated && (
                <span className="ml-2 opacity-60">· {lastUpdated}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => goTo((current + 1) % drugs.length)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
