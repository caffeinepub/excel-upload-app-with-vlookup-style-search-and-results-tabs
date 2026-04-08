import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface DrugFolder {
  id: string;
  name: string;
  patentNumbers: string[];
  createdAt: number;
}

interface PatentUpdate {
  drugName: string;
  patentNumber: string;
  title: string;
  date: string;
  assignee?: string;
  source: "USPTO" | "FDA";
  url: string;
}

async function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Strip "US" prefix and leading zeros to get bare patent number for PatentsView */
function normalizeUSPTONumber(raw: string): string {
  const up = raw.toUpperCase().replace(/[\s\-]/g, "");
  const stripped = up.startsWith("US") ? up.slice(2) : up;
  return stripped.replace(/^0+/, "") || stripped;
}

/**
 * Fetch USPTO patent updates via CORS proxy to avoid direct CORS block.
 * Uses allorigins.win as proxy, falls back to corsproxy.io.
 */
async function fetchUSPTOUpdates(
  drugName: string,
  days = 7,
): Promise<PatentUpdate[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dateStr = cutoff.toISOString().split("T")[0];

  const q = JSON.stringify({
    _and: [
      { _gte: { patent_date: dateStr } },
      { _text_any: { patent_title: drugName } },
    ],
  });
  const f = JSON.stringify([
    "patent_number",
    "patent_title",
    "patent_date",
    "assignees.assignee_organization",
  ]);
  const o = JSON.stringify({ sort: [{ patent_date: "desc" }], per_page: 3 });
  const targetUrl = `https://api.patentsview.org/patents/query?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&o=${encodeURIComponent(o)}`;

  const parseData = (data: {
    patents?: Array<{
      patent_number?: string;
      patent_title?: string;
      patent_date?: string;
      assignees?: Array<{ assignee_organization?: string }>;
    }>;
  }): PatentUpdate[] =>
    (data?.patents ?? []).map((p) => ({
      drugName,
      patentNumber: `US${p.patent_number ?? ""}`,
      title: p.patent_title ?? p.patent_number ?? "Unknown title",
      date: p.patent_date ?? "",
      assignee: p.assignees?.[0]?.assignee_organization,
      source: "USPTO" as const,
      url: `https://patents.google.com/patent/US${normalizeUSPTONumber(p.patent_number ?? "")}/en`,
    }));

  // Strategy 1: allorigins proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const res = await withTimeout(
      fetch(proxyUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      12000,
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.patents !== undefined) return parseData(data);
    }
  } catch {
    /* try next */
  }

  // Strategy 2: corsproxy.io fallback
  try {
    const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const res = await withTimeout(
      fetch(proxyUrl2, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      12000,
    );
    if (res.ok) {
      const data = await res.json();
      return parseData(data);
    }
  } catch {
    /* ignore */
  }

  // Strategy 3: direct (in case CORS is allowed)
  try {
    const res = await withTimeout(
      fetch(targetUrl, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        mode: "cors",
      }),
      10000,
    );
    if (res.ok) {
      const data = await res.json();
      return parseData(data);
    }
  } catch {
    /* ignore */
  }

  return [];
}

async function fetchFDAUpdates(drugName: string): Promise<PatentUpdate[]> {
  const fdaBase = "https://api.fda.gov/drug/drugsfda.json";
  const fdaUrl =
    "https://www.fda.gov/drugs/drug-approvals-and-databases/new-drug-therapy-approvals";

  const trySearch = async (searchUrl: string): Promise<PatentUpdate[]> => {
    const res = await withTimeout(
      fetch(searchUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
      8000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results: PatentUpdate[] = [];
    for (const r of data?.results ?? []) {
      const sub = r.submissions?.find(
        (s: { submission_status?: string }) => s.submission_status === "AP",
      );
      if (!sub) continue;
      const brandName =
        r.openfda?.brand_name?.[0] ?? r.openfda?.generic_name?.[0] ?? drugName;
      results.push({
        drugName,
        patentNumber: brandName,
        title: `FDA Approval — ${r.sponsor_name ?? "Unknown sponsor"}`,
        date: sub.submission_status_date ?? "",
        assignee: r.sponsor_name,
        source: "FDA",
        url: fdaUrl,
      });
    }
    return results;
  };

  try {
    const url1 = `${fdaBase}?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=3`;
    const r1 = await trySearch(url1);
    if (r1.length) return r1;

    const url2 = `${fdaBase}?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`;
    return trySearch(url2);
  } catch {
    return [];
  }
}

export default function PatentUpdatesKPI() {
  const [updates, setUpdates] = useState<PatentUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [trackedNames, setTrackedNames] = useState<string[]>([]);

  const loadTrackedNames = useCallback(() => {
    try {
      const folders: DrugFolder[] = JSON.parse(
        localStorage.getItem("patentFolders") ?? "[]",
      );
      const tracked: string[] = JSON.parse(
        localStorage.getItem("patentTrackedFolders") ?? "[]",
      );
      const names = folders
        .filter((f) => tracked.includes(f.id))
        .map((f) => f.name);
      setTrackedNames(names);
      return names;
    } catch {
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    const names = loadTrackedNames();
    if (names.length === 0) {
      setUpdates([]);
      setLastRefresh(Date.now());
      return;
    }
    setLoading(true);
    try {
      const allFetches = names.flatMap((n) => [
        fetchUSPTOUpdates(n),
        fetchFDAUpdates(n),
      ]);
      const results = await Promise.allSettled(allFetches);
      const all: PatentUpdate[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") all.push(...r.value);
      }
      const seen = new Set<string>();
      const deduped = all
        .filter((u) => {
          const key = `${u.source}-${u.patentNumber}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setUpdates(deduped);
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  }, [loadTrackedNames]);

  useEffect(() => {
    loadTrackedNames();
    refresh();
  }, [loadTrackedNames, refresh]);

  return (
    <div
      className="rounded-2xl border border-border/40 bg-card shadow-mac-soft overflow-hidden"
      data-ocid="patent-updates-kpi.panel"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <ShieldCheck className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">
          Patent Tracker Updates
        </span>
        {trackedNames.length > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] ml-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          >
            {trackedNames.length} drug{trackedNames.length !== 1 ? "s" : ""}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={refresh}
          disabled={loading}
          title="Refresh patent updates"
          data-ocid="patent-updates-kpi.refresh_button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="p-3 space-y-1.5 min-h-[80px]">
        {loading && (
          <div
            className="space-y-2 py-1"
            data-ocid="patent-updates-kpi.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        )}

        {!loading && trackedNames.length === 0 && (
          <div
            className="flex flex-col items-center gap-1.5 py-4 text-center"
            data-ocid="patent-updates-kpi.empty_state"
          >
            <p className="text-xs font-medium text-muted-foreground">
              No drugs tracked yet
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Open Patent Tracker → mark a folder as "Track" to see daily
              updates here.
            </p>
          </div>
        )}

        {!loading && trackedNames.length > 0 && updates.length === 0 && (
          <div
            className="flex flex-col items-center gap-1.5 py-4 text-center"
            data-ocid="patent-updates-kpi.no_updates_state"
          >
            <p className="text-xs font-medium text-muted-foreground">
              No patent updates this week
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              Tracking {trackedNames.join(", ")} · checked USPTO &amp; FDA
            </p>
          </div>
        )}

        {!loading &&
          updates.slice(0, 6).map((u, i) => (
            <div
              key={`${u.source}-${u.patentNumber}-${i}`}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors"
              data-ocid={`patent-updates-kpi.update.item.${i + 1}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                  u.source === "FDA" ? "bg-emerald-500" : "bg-violet-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded flex-shrink-0 ${
                      u.source === "FDA"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    }`}
                  >
                    {u.source}
                  </span>
                  <span className="text-[10px] font-bold text-foreground/80 uppercase truncate max-w-[80px]">
                    {u.drugName}
                  </span>
                  <span className="text-[10px] font-mono text-foreground/70">
                    {u.patentNumber}
                  </span>
                  {u.date && (
                    <span className="text-[10px] text-muted-foreground">
                      {u.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/70 line-clamp-1">
                  {u.title}
                </p>
                {u.assignee && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {u.assignee}
                  </p>
                )}
              </div>
              <a
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 flex-shrink-0 mt-0.5"
                title="View patent"
                data-ocid={`patent-updates-kpi.update.link.${i + 1}`}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
      </div>

      {lastRefresh && (
        <div className="px-4 pb-2 text-[10px] text-muted-foreground/60">
          Checked:{" "}
          {new Date(lastRefresh).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · USPTO + FDA (via CORS proxy)
        </div>
      )}
    </div>
  );
}
