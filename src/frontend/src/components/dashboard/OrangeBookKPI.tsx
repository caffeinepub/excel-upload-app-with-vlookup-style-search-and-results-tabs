import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

function getDrugName(drug: FDADrug): string {
  return (
    drug.openfda?.brand_name?.[0] ??
    drug.openfda?.generic_name?.[0] ??
    drug.application_number
  );
}

function getGeneric(drug: FDADrug): string {
  return drug.openfda?.generic_name?.[0] ?? "";
}

function getApprovalDate(drug: FDADrug): string {
  const subs = drug.submissions ?? [];
  const approved = subs
    .filter((s) => s.submission_status === "AP")
    .sort((a, b) =>
      (b.submission_status_date ?? "").localeCompare(
        a.submission_status_date ?? "",
      ),
    );
  return formatDate(approved[0]?.submission_status_date);
}

function getAppType(drug: FDADrug): string {
  const app = drug.application_number ?? "";
  if (app.startsWith("ANDA")) return "Generic (ANDA)";
  if (app.startsWith("NDA")) return "Brand (NDA)";
  if (app.startsWith("BLA")) return "Biologic (BLA)";
  return app.slice(0, 4);
}

async function fetchOrangeBookApprovals(): Promise<FDADrug[]> {
  // ANDA = generic drug applications listed in Orange Book
  // Do not sort by nested field — sort client-side instead
  const url =
    "https://api.fda.gov/drug/drugsfda.json?search=submissions.submission_status%3A%22AP%22+AND+application_number:ANDA*&limit=20";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FDA Orange Book API error: ${res.status}`);
  const data = await res.json();
  const all: FDADrug[] = data?.results ?? [];
  // Sort client-side by most recent AP submission date
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
    .slice(0, 5)
    .map((x) => x.drug);
  return sorted.length > 0 ? sorted : all.slice(0, 5);
}

export default function OrangeBookKPI() {
  const [drugs, setDrugs] = useState<FDADrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOrangeBookApprovals()
      .then((results) => {
        setDrugs(results);
        setLoading(false);
        setLastUpdated(
          new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
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

  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-mac-soft flex flex-col overflow-hidden"
      data-ocid="orangebook_kpi.card"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
          <BookOpen className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">
            Orange Book — New Approvals
          </span>
          {lastUpdated && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              as of {lastUpdated}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

      <div className="flex-1 px-4 py-3 space-y-0 divide-y divide-border/30">
        {loading && (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              Unable to load Orange Book data.
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
          <p className="text-xs text-muted-foreground text-center py-6">
            No recent generic approvals found.
          </p>
        )}
        {!loading &&
          !error &&
          drugs.map((drug, idx) => (
            <div
              key={drug.application_number}
              className="py-2.5 first:pt-0"
              data-ocid={`orangebook_kpi.item.${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={`https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${drug.application_number.replace(/^[A-Z]+/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 group"
                >
                  <span className="text-sm font-semibold text-foreground leading-tight group-hover:text-emerald-600 group-hover:underline transition-colors">
                    {getDrugName(drug)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  {getAppType(drug)}
                </Badge>
              </div>
              {getGeneric(drug) && getDrugName(drug) !== getGeneric(drug) && (
                <p className="text-[11px] text-muted-foreground italic mt-0.5">
                  {getGeneric(drug)}
                </p>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                {drug.sponsor_name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {drug.sponsor_name}
                  </span>
                )}
                {getApprovalDate(drug) && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-auto shrink-0">
                    {getApprovalDate(drug)}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      <div className="px-4 py-2 border-t border-border/40 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Generic drug approvals from FDA Orange Book
        </p>
        <a
          href="https://www.accessdata.fda.gov/scripts/cder/ob/index.cfm"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary hover:underline"
        >
          View Full OB
        </a>
      </div>
    </div>
  );
}
