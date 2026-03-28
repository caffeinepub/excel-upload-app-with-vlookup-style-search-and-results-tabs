import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ExternalLink, Pill } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FDADrug {
  application_number: string;
  sponsor_name: string;
  brand_name?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
  };
  submissions?: {
    submission_status_date?: string;
    submission_status?: string;
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
  return formatDate(
    approved[0]?.submission_status_date ??
      drug.submissions?.[0]?.submission_status_date,
  );
}

function getDrugName(drug: FDADrug): string {
  return (
    drug.brand_name ??
    drug.openfda?.brand_name?.[0] ??
    drug.openfda?.generic_name?.[0] ??
    drug.application_number
  );
}

export default function FDAApprovalsKPI() {
  const [drugs, setDrugs] = useState<FDADrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://api.fda.gov/drug/drugsfda.json?sort=submissions.submission_status_date:desc&limit=10",
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        const results: FDADrug[] = data?.results ?? [];
        setDrugs(results);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (drugs.length === 0) return;
    setProgress(0);

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
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Pill className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1">
          Latest FDA Approvals
        </span>
        <Badge variant="secondary" className="text-[10px]">
          Live
        </Badge>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 min-h-[140px] justify-center">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        {error && (
          <p className="text-xs text-muted-foreground text-center">
            Unable to load FDA data. Please try again later.
          </p>
        )}
        {!loading && !error && drug && (
          <div className="space-y-2">
            <a
              href={labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1 group"
              data-ocid="fda_kpi.link"
            >
              <span className="text-sm font-bold text-primary leading-tight group-hover:underline">
                {getDrugName(drug)}
              </span>
              <ExternalLink className="h-3 w-3 text-primary flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
            </a>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {drug.application_number}
                </span>
              </span>
              {drug.sponsor_name && (
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {drug.sponsor_name}
                </span>
              )}
            </div>
            {getLatestApproval(drug) && (
              <span className="text-[11px] text-muted-foreground">
                Approved:{" "}
                <span className="text-foreground font-medium">
                  {getLatestApproval(drug)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
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
              data-ocid="fda_kpi.pagination_prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-muted-foreground">
              {current + 1} / {drugs.length}
            </span>
            <button
              type="button"
              onClick={() => goTo((current + 1) % drugs.length)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="fda_kpi.pagination_next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
