import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

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
    drug.brand_name ??
    drug.openfda?.brand_name?.[0] ??
    drug.openfda?.generic_name?.[0] ??
    drug.application_number
  );
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
  return formatDate(
    approved[0]?.submission_status_date ?? subs[0]?.submission_status_date,
  );
}

export default function OrangeBookKPI() {
  const [drugs, setDrugs] = useState<FDADrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://api.fda.gov/drug/drugsfda.json?search=submissions.submission_type:ORIG&sort=submissions.submission_status_date:desc&limit=5",
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        setDrugs(data?.results ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-mac-soft flex flex-col overflow-hidden"
      data-ocid="orangebook_kpi.card"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
          <BookOpen className="h-4 w-4 text-emerald-500" />
        </div>
        <span className="text-sm font-semibold text-foreground flex-1">
          Orange Book — New Approvals
        </span>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Body */}
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
        {error && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Unable to load Orange Book data. Please try again later.
          </p>
        )}
        {!loading && !error && drugs.length === 0 && (
          <p
            className="text-xs text-muted-foreground text-center py-6"
            data-ocid="orangebook_kpi.empty_state"
          >
            No recent approvals found.
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
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {getDrugName(drug)}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  {drug.application_number.startsWith("A") ? "ANDA" : "NDA"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {drug.sponsor_name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {drug.sponsor_name}
                  </span>
                )}
                {getApprovalDate(drug) && (
                  <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                    {getApprovalDate(drug)}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground">
          Updated daily from FDA Orange Book
        </p>
      </div>
    </div>
  );
}
