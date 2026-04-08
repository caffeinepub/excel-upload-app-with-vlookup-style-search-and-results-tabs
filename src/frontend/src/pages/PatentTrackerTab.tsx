import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  FileSearch,
  Filter,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrugFolder {
  id: string;
  name: string;
  patentNumbers: string[];
  createdAt: number;
}

type PatentSourceKey =
  | "USPTO"
  | "FDA"
  | "GooglePatents"
  | "Espacenet"
  | "PMDA"
  | "NMPA"
  | "KoreaMFDS"
  | "WIPO"
  | "SpringerNature";

type SourceStatus = "loading" | "found" | "not_found" | "error" | "link_only";

interface SourceResult {
  status: SourceStatus;
  title?: string;
  patentStatus?: string;
  filingDate?: string;
  grantDate?: string;
  assignee?: string;
  inventors?: string[];
  abstract?: string;
  drugBrand?: string;
  approvalDate?: string;
  applicant?: string;
  applicationNumber?: string;
  url: string;
  error?: string;
  expiryInfo?: string;
}

export interface PatentInfo {
  patentNumber: string;
  primarySource: "USPTO" | "EPO" | "JP" | "CN" | "KR" | "WO" | "Unknown";
  sources: Record<PatentSourceKey, SourceResult>;
  lastChecked: number;
  loading?: boolean;
}

export { fetchPatentInfo };

type FilterType = "All" | "US" | "EP" | "JP" | "CN" | "KR" | "WO";
type SortType = "added" | "number" | "status";

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const LS_FOLDERS = "patentFolders";
const LS_TRACKED = "patentTrackedFolders";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function loadFolders(): DrugFolder[] {
  try {
    return JSON.parse(localStorage.getItem(LS_FOLDERS) ?? "[]");
  } catch {
    return [];
  }
}
function saveFolders(f: DrugFolder[]) {
  localStorage.setItem(LS_FOLDERS, JSON.stringify(f));
}
function loadTracked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_TRACKED) ?? "[]");
  } catch {
    return [];
  }
}
function saveTracked(ids: string[]) {
  localStorage.setItem(LS_TRACKED, JSON.stringify(ids));
}

function loadCachedPatent(pn: string): PatentInfo | null {
  try {
    const raw = localStorage.getItem(`patentCache_${pn}`);
    if (!raw) return null;
    const cached: PatentInfo = JSON.parse(raw);
    if (Date.now() - cached.lastChecked > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}
function saveCachedPatent(info: PatentInfo) {
  try {
    localStorage.setItem(
      `patentCache_${info.patentNumber}`,
      JSON.stringify(info),
    );
  } catch {
    /* ignore */
  }
}

// ─── Patent Source Detection ──────────────────────────────────────────────────

function detectPrimarySource(pn: string): PatentInfo["primarySource"] {
  const up = pn.toUpperCase().replace(/[\s\-]/g, "");
  if (up.startsWith("EP")) return "EPO";
  if (up.startsWith("JP")) return "JP";
  if (up.startsWith("CN")) return "CN";
  if (up.startsWith("KR")) return "KR";
  if (up.startsWith("WO")) return "WO";
  if (up.startsWith("US") || /^\d/.test(up)) return "USPTO";
  return "Unknown";
}

function normalizePatentNumber(pn: string): string {
  return pn.toUpperCase().replace(/[\s\-,]/g, "");
}

function getDigits(pn: string): string {
  return pn.replace(/[^0-9]/g, "");
}

/** Strip country prefix and return bare numeric/alphanumeric ID for PatentsView */
function getUSPTOQueryNumber(pn: string): string {
  const norm = normalizePatentNumber(pn);
  const stripped = norm.startsWith("US") ? norm.slice(2) : norm;
  return stripped.replace(/^0+/, "") || stripped;
}

function buildGooglePatentsUrl(pn: string): string {
  const norm = normalizePatentNumber(pn);
  const src = detectPrimarySource(pn);
  if (src === "USPTO" || src === "Unknown") {
    const digits = getDigits(pn);
    return `https://patents.google.com/patent/US${digits}/en`;
  }
  return `https://patents.google.com/patent/${norm}/en`;
}

function formatDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

interface PatentsViewPatent {
  patent_number?: string;
  patent_title?: string;
  patent_date?: string;
  patent_abstract?: string;
  patent_type?: string;
  app_date?: string;
  assignees?: Array<{ assignee_organization?: string }>;
  inventors?: Array<{
    inventor_last_name?: string;
    inventor_first_name?: string;
  }>;
}

function buildUSPTOResult(p: PatentsViewPatent, url: string): SourceResult {
  const assigneeOrg = p.assignees?.[0]?.assignee_organization;
  const inventorNames = (p.inventors ?? [])
    .slice(0, 3)
    .map((inv) =>
      [inv.inventor_first_name, inv.inventor_last_name]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean);

  const grantDate = p.patent_date;
  const filingDate = p.app_date;

  let patentStatus = "Published";
  let expiryInfo: string | undefined;

  if (grantDate) {
    const gd = new Date(grantDate);
    const now = new Date();
    const ageYears =
      (now.getTime() - gd.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (ageYears > 20) {
      patentStatus = "Expired";
      expiryInfo = "Expired (>20 years from grant)";
    } else {
      patentStatus = "Granted";
      const baseDate = filingDate ? new Date(filingDate) : gd;
      const baseAge =
        (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const yearsLeft = Math.ceil(20 - baseAge);
      expiryInfo = `~${yearsLeft} yr${yearsLeft !== 1 ? "s" : ""} remaining (20 yrs from filing)`;
    }
  } else if (filingDate) {
    patentStatus = "Application Filed";
  }

  const abstract = p.patent_abstract;
  const truncatedAbstract = abstract
    ? abstract.length > 250
      ? `${abstract.substring(0, 250)}…`
      : abstract
    : undefined;

  return {
    status: "found",
    title: p.patent_title ?? undefined,
    patentStatus,
    filingDate: formatDate(filingDate),
    grantDate: formatDate(grantDate),
    assignee: assigneeOrg ?? undefined,
    inventors: inventorNames.length ? inventorNames : undefined,
    abstract: truncatedAbstract,
    url,
    expiryInfo,
  };
}

/**
 * USPTO PatentsView API — multi-strategy with CORS proxy fallback.
 *
 * Strategy 1: PatentsView v1 GET via allorigins CORS proxy
 * Strategy 2: PatentsView GET direct (may work if CORS policy is relaxed)
 * Strategy 3: allorigins with alternate query format
 * All fail → return error with USPTO.gov link
 */
async function fetchUSPTO(pn: string): Promise<SourceResult> {
  const googleUrl = buildGooglePatentsUrl(pn);
  const queryNum = getUSPTOQueryNumber(pn);
  const usptoDirectUrl = `https://ppubs.uspto.gov/pubwebapp/external.html?q=pn/${queryNum}&type=pbn&db=USPAT`;

  if (!queryNum || !/\d/.test(queryNum)) {
    return { status: "link_only", url: googleUrl };
  }

  const fields = [
    "patent_number",
    "patent_title",
    "patent_date",
    "patent_abstract",
    "patent_type",
    "app_date",
    "assignees.assignee_organization",
    "inventors.inventor_last_name",
    "inventors.inventor_first_name",
  ];

  // Build PatentsView GET URL (URL-encoded query)
  const buildPatentsViewUrl = (num: string) => {
    const q = JSON.stringify({ patent_number: num });
    const f = JSON.stringify(fields);
    const o = JSON.stringify({ per_page: 1 });
    return `https://api.patentsview.org/patents/query?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&o=${encodeURIComponent(o)}`;
  };

  // Strategy 1: Use allorigins CORS proxy with GET request
  const tryWithProxy = async (
    patentNum: string,
  ): Promise<PatentsViewPatent | null> => {
    const targetUrl = buildPatentsViewUrl(patentNum);
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const res = await withTimeout(
      fetch(proxyUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      12000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.patents?.[0] ?? null;
  };

  // Strategy 2: Direct GET (no proxy - might work for some browsers/environments)
  const tryDirect = async (
    patentNum: string,
  ): Promise<PatentsViewPatent | null> => {
    const targetUrl = buildPatentsViewUrl(patentNum);
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
    if (!res.ok) return null;
    const data = await res.json();
    return data?.patents?.[0] ?? null;
  };

  // Strategy 3: corsproxy.io fallback
  const tryCorsproxy = async (
    patentNum: string,
  ): Promise<PatentsViewPatent | null> => {
    const targetUrl = buildPatentsViewUrl(patentNum);
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const res = await withTimeout(
      fetch(proxyUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      12000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.patents?.[0] ?? null;
  };

  const attempts = [
    () => tryWithProxy(queryNum),
    () => tryDirect(queryNum),
    () => tryCorsproxy(queryNum),
    // Try with zero-padded version if numeric
    () =>
      /^\d+$/.test(queryNum) ? tryWithProxy(queryNum.padStart(7, "0")) : null,
  ];

  for (const attempt of attempts) {
    try {
      const patent = await attempt();
      if (patent) {
        return buildUSPTOResult(patent, googleUrl);
      }
    } catch {
      // Try next strategy
    }
  }

  // All strategies failed — show useful fallback
  return {
    status: "error",
    error: "USPTO data unavailable via API — click to view on USPTO.gov",
    url: usptoDirectUrl,
  };
}

async function fetchFDA(pn: string, drugName: string): Promise<SourceResult> {
  const fdaBase = "https://api.fda.gov/drug/drugsfda.json";
  const fdaUrl =
    "https://www.fda.gov/drugs/drug-approvals-and-databases/new-drug-therapy-approvals";
  const digits = getDigits(pn);

  const parseResult = (
    results: Array<{
      openfda?: { brand_name?: string[]; generic_name?: string[] };
      products?: Array<{ brand_name?: string }>;
      sponsor_name?: string;
      submissions?: Array<{
        submission_status?: string;
        submission_status_date?: string;
        submission_type?: string;
        application_number?: string;
      }>;
    }>,
  ): SourceResult => {
    const r = results[0];
    const sub =
      r.submissions?.find((s) => s.submission_status === "AP") ??
      r.submissions?.[0];
    const brandName =
      r.openfda?.brand_name?.[0] ??
      r.openfda?.generic_name?.[0] ??
      r.products?.[0]?.brand_name ??
      drugName;
    return {
      status: "found",
      drugBrand: brandName,
      approvalDate: sub?.submission_status_date
        ? formatDate(sub.submission_status_date)
        : undefined,
      applicant: r.sponsor_name,
      applicationNumber: sub?.application_number,
      url: fdaUrl,
    };
  };

  try {
    if (digits) {
      const url1 = `${fdaBase}?search=openfda.patent_number:"${digits}"&limit=3`;
      const res1 = await withTimeout(
        fetch(url1, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        8000,
      );
      if (res1.ok) {
        const d1 = await res1.json();
        if (d1?.results?.length) return parseResult(d1.results);
      }
    }

    if (drugName) {
      const url2 = `${fdaBase}?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=3`;
      const res2 = await withTimeout(
        fetch(url2, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        8000,
      );
      if (res2.ok) {
        const d2 = await res2.json();
        if (d2?.results?.length) return parseResult(d2.results);
      }

      const url3 = `${fdaBase}?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`;
      const res3 = await withTimeout(
        fetch(url3, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        8000,
      );
      if (res3.ok) {
        const d3 = await res3.json();
        if (d3?.results?.length) return parseResult(d3.results);
      }
    }

    return { status: "not_found", url: fdaUrl };
  } catch {
    return {
      status: "error",
      error: "FDA data unavailable — click to view",
      url: fdaUrl,
    };
  }
}

function buildAllSources(
  pn: string,
  drugName: string,
): Record<PatentSourceKey, SourceResult> {
  const norm = normalizePatentNumber(pn);
  const digits = getDigits(pn);
  const src = detectPrimarySource(pn);

  const googleUrl = buildGooglePatentsUrl(pn);
  const espacenetUrl =
    src === "EPO"
      ? `https://worldwide.espacenet.com/patent/search?q=pn%3D${norm}`
      : `https://worldwide.espacenet.com/patent/search?q=pn%3DUS${digits}`;
  const wipoUrl =
    src === "WO"
      ? `https://patentscope.wipo.int/search/en/detail.jsf?docId=${norm}`
      : `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(pn)}`;
  const jpUrl =
    src === "JP"
      ? "https://www.j-platpat.inpit.go.jp/s0100"
      : "https://www.pmda.go.jp/english/review-services/reviews/approved-information/drugs/0001.html";
  const cnUrl =
    src === "CN"
      ? "https://pss-system.cnipr.com/sipopublicsearch/portal/uiIndex.shtml"
      : "https://www.nmpa.gov.cn/";
  const krUrl =
    src === "KR" ? "https://www.kipris.or.kr/" : "https://nedrug.mfds.go.kr/";

  const usptoViewNum =
    src === "USPTO" || src === "Unknown" ? `US${digits}` : norm;
  return {
    USPTO: {
      status: "loading",
      url: `https://patents.google.com/patent/${usptoViewNum}/en`,
    },
    FDA: {
      status: "loading",
      url: "https://www.fda.gov/drugs/drug-approvals-and-databases/new-drug-therapy-approvals",
    },
    GooglePatents: { status: "link_only", url: googleUrl },
    Espacenet: { status: "link_only", url: espacenetUrl },
    PMDA: { status: "link_only", url: jpUrl },
    NMPA: { status: "link_only", url: cnUrl },
    KoreaMFDS: { status: "link_only", url: krUrl },
    WIPO: { status: "link_only", url: wipoUrl },
    SpringerNature: {
      status: "link_only",
      url: `https://link.springer.com/search?query=${encodeURIComponent(drugName || pn)}`,
    },
  };
}

async function fetchPatentInfo(pn: string, drugName = ""): Promise<PatentInfo> {
  const primarySource = detectPrimarySource(pn);
  const sources = buildAllSources(pn, drugName);

  const [usptoResult, fdaResult] = await Promise.allSettled([
    fetchUSPTO(pn),
    fetchFDA(pn, drugName),
  ]);

  sources.USPTO =
    usptoResult.status === "fulfilled"
      ? usptoResult.value
      : {
          status: "error",
          error: "USPTO data unavailable — click to view on USPTO.gov",
          url: `https://ppubs.uspto.gov/pubwebapp/external.html?q=pn/${getUSPTOQueryNumber(pn)}&type=pbn&db=USPAT`,
        };
  sources.FDA =
    fdaResult.status === "fulfilled"
      ? fdaResult.value
      : {
          status: "error",
          error: "FDA data unavailable",
          url: sources.FDA.url,
        };

  return {
    patentNumber: pn,
    primarySource,
    sources,
    lastChecked: Date.now(),
  };
}

async function searchNewArrivals(drugName: string): Promise<
  Array<{
    patentNumber: string;
    title: string;
    date: string;
    assignee?: string;
    source: string;
  }>
> {
  const results: Array<{
    patentNumber: string;
    title: string;
    date: string;
    assignee?: string;
    source: string;
  }> = [];

  // USPTO search via CORS proxy
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
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
    const o = JSON.stringify({ sort: [{ patent_date: "desc" }], per_page: 5 });
    const targetUrl = `https://api.patentsview.org/patents/query?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&o=${encodeURIComponent(o)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const res = await withTimeout(
      fetch(proxyUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
      12000,
    );
    if (res.ok) {
      const data = await res.json();
      for (const p of data?.patents ?? []) {
        results.push({
          patentNumber: `US${p.patent_number}`,
          title: p.patent_title ?? p.patent_number,
          date: p.patent_date ?? "",
          assignee: p.assignees?.[0]?.assignee_organization,
          source: "USPTO",
        });
      }
    }
  } catch {
    /* ignore */
  }

  // FDA recent applications for the drug name
  try {
    const fdaUrl = `https://api.fda.gov/drug/drugsfda.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=5`;
    const res = await withTimeout(
      fetch(fdaUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
      8000,
    );
    if (res.ok) {
      const data = await res.json();
      for (const r of data?.results ?? []) {
        const sub = r.submissions?.find(
          (s: { submission_type?: string; submission_status?: string }) =>
            s.submission_type === "NDA" || s.submission_type === "ANDA",
        );
        if (sub) {
          results.push({
            patentNumber: r.openfda?.brand_name?.[0] ?? drugName,
            title: `FDA ${sub.submission_type} — ${r.sponsor_name ?? "Unknown"}`,
            date: sub.submission_status_date ?? "",
            assignee: r.sponsor_name,
            source: "FDA",
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  return results;
}

// ─── UI Sub-components ────────────────────────────────────────────────────────

const SOURCE_META: Record<
  PatentSourceKey,
  { label: string; flag: string; color: string }
> = {
  USPTO: { label: "USPTO", flag: "🇺🇸", color: "bg-blue-600" },
  FDA: { label: "FDA", flag: "💊", color: "bg-emerald-600" },
  GooglePatents: {
    label: "Google Patents",
    flag: "🔍",
    color: "bg-orange-500",
  },
  Espacenet: { label: "Espacenet / EPO", flag: "🇪🇺", color: "bg-indigo-600" },
  PMDA: { label: "PMDA Japan", flag: "🇯🇵", color: "bg-rose-600" },
  NMPA: { label: "NMPA China", flag: "🇨🇳", color: "bg-red-600" },
  KoreaMFDS: { label: "Korea MFDS", flag: "🇰🇷", color: "bg-teal-600" },
  WIPO: { label: "WIPO", flag: "🌐", color: "bg-violet-600" },
  SpringerNature: {
    label: "Springer Nature",
    flag: "📚",
    color: "bg-amber-600",
  },
};

function StatusBadge({ status }: { status?: string }) {
  if (!status)
    return (
      <Badge variant="outline" className="text-[10px]">
        Unknown
      </Badge>
    );
  const s = status.toLowerCase();
  if (s.includes("grant") || s.includes("active")) {
    return (
      <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
        ✓ {status}
      </Badge>
    );
  }
  if (
    s.includes("pending") ||
    s.includes("publish") ||
    s.includes("application") ||
    s.includes("filed")
  ) {
    return (
      <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0">
        ⏳ {status}
      </Badge>
    );
  }
  if (s.includes("expir") || s.includes("abandon") || s.includes("withdraw")) {
    return (
      <Badge className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-0">
        ✗ {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {status}
    </Badge>
  );
}

function SourceCard({
  sourceKey,
  result,
}: { sourceKey: PatentSourceKey; result: SourceResult }) {
  const meta = SOURCE_META[sourceKey];
  const [showAbstract, setShowAbstract] = useState(false);

  return (
    <div className="rounded-xl border border-border/30 bg-background/60 p-3 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">{meta.flag}</span>
        <span className="text-xs font-semibold text-foreground truncate">
          {meta.label}
        </span>
        {result.status === "loading" && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto flex-shrink-0" />
        )}
      </div>

      {result.status === "found" && (
        <div className="space-y-1.5">
          {sourceKey === "USPTO" && (
            <>
              {result.title && (
                <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-3">
                  {result.title}
                </p>
              )}
              {result.patentStatus && (
                <StatusBadge status={result.patentStatus} />
              )}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                {result.filingDate && (
                  <>
                    <span className="font-medium text-foreground/70">
                      Filed:
                    </span>
                    <span>{result.filingDate}</span>
                  </>
                )}
                {result.grantDate && (
                  <>
                    <span className="font-medium text-foreground/70">
                      Granted:
                    </span>
                    <span>{result.grantDate}</span>
                  </>
                )}
                {result.assignee && (
                  <>
                    <span className="font-medium text-foreground/70">
                      Assignee:
                    </span>
                    <span className="truncate">{result.assignee}</span>
                  </>
                )}
                {result.inventors?.length && (
                  <>
                    <span className="font-medium text-foreground/70">
                      Inventors:
                    </span>
                    <span className="truncate">
                      {result.inventors.slice(0, 2).join(", ")}
                    </span>
                  </>
                )}
              </div>
              {result.expiryInfo && (
                <p className="text-[10px] text-primary/80 font-medium bg-primary/5 rounded px-1.5 py-0.5">
                  ⏱ {result.expiryInfo}
                </p>
              )}
              {result.abstract && (
                <div>
                  <p
                    className={`text-[10px] text-muted-foreground leading-relaxed ${showAbstract ? "" : "line-clamp-2"}`}
                  >
                    {result.abstract}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAbstract(!showAbstract)}
                    className="text-[10px] text-primary hover:text-primary/80 mt-0.5"
                  >
                    {showAbstract ? "Show less" : "Show abstract"}
                  </button>
                </div>
              )}
            </>
          )}
          {sourceKey === "FDA" && (
            <>
              {result.drugBrand && (
                <p className="text-[11px] font-semibold text-foreground">
                  {result.drugBrand}
                </p>
              )}
              {result.applicant && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Sponsor: {result.applicant}
                </p>
              )}
              {result.applicationNumber && (
                <p className="text-[10px] text-muted-foreground">
                  App #: {result.applicationNumber}
                </p>
              )}
              {result.approvalDate && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Approved: {result.approvalDate}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {result.status === "not_found" && (
        <p className="text-[10px] text-muted-foreground italic">
          {sourceKey === "USPTO"
            ? "Not found in USPTO database — may be an EP/JP/CN patent"
            : "No matching drug application found"}
        </p>
      )}
      {result.status === "error" && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          ⚠ {result.error}
        </p>
      )}
      {result.status === "link_only" && (
        <p className="text-[10px] text-muted-foreground italic">
          Search on external database →
        </p>
      )}

      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors mt-auto"
        data-ocid={`patent-tracker.source.link.${sourceKey.toLowerCase()}`}
      >
        View on {meta.label.split(" ")[0]}
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}

function PatentRow({
  info,
  drugName,
  onRefresh,
  onDelete,
}: {
  info: PatentInfo;
  drugName: string;
  onRefresh: (pn: string) => void;
  onDelete: (pn: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const usptoResult = info.sources.USPTO;
  const fdaResult = info.sources.FDA;
  const mainTitle =
    usptoResult.title ?? (info.loading ? "Fetching data…" : undefined);
  const mainStatus = usptoResult.patentStatus;

  const copyLinks = () => {
    const lines = (Object.keys(info.sources) as PatentSourceKey[])
      .map((k) => `${SOURCE_META[k].label}: ${info.sources[k].url}`)
      .join("\n");
    navigator.clipboard
      .writeText(lines)
      .then(() => toast.success("All source links copied!"));
  };

  const srcBadgeColor =
    info.primarySource === "USPTO"
      ? "bg-blue-600"
      : info.primarySource === "EPO"
        ? "bg-indigo-600"
        : info.primarySource === "JP"
          ? "bg-rose-600"
          : info.primarySource === "CN"
            ? "bg-red-600"
            : info.primarySource === "KR"
              ? "bg-teal-600"
              : info.primarySource === "WO"
                ? "bg-violet-600"
                : "bg-muted-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm"
      data-ocid="patent-tracker.patent.row"
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-3.5 hover:bg-accent/5 transition-colors">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold text-white flex-shrink-0 ${srcBadgeColor}`}
            >
              {info.primarySource === "Unknown" ? "US" : info.primarySource}
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              {info.patentNumber}
            </span>
            {info.loading ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Fetching…
              </span>
            ) : (
              <StatusBadge status={mainStatus} />
            )}
          </div>

          {mainTitle && (
            <p className="text-xs font-semibold text-foreground/90 line-clamp-2 leading-snug">
              {mainTitle}
            </p>
          )}
          {!mainTitle && !info.loading && usptoResult.status === "error" && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                ⚠ {usptoResult.error}
              </p>
              <a
                href={usptoResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:text-primary/80 underline flex items-center gap-0.5"
              >
                View on USPTO <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}
          {!mainTitle &&
            !info.loading &&
            usptoResult.status === "not_found" && (
              <p className="text-[10px] text-muted-foreground italic">
                Title unavailable — patent not in USPTO database
              </p>
            )}

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            {usptoResult.assignee && (
              <span className="truncate max-w-[200px] font-medium">
                {usptoResult.assignee}
              </span>
            )}
            {usptoResult.filingDate && (
              <span>Filed: {usptoResult.filingDate}</span>
            )}
            {usptoResult.grantDate && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Granted: {usptoResult.grantDate}
              </span>
            )}
          </div>

          {usptoResult.expiryInfo && (
            <p className="text-[10px] text-primary/70 font-medium">
              ⏱ {usptoResult.expiryInfo}
            </p>
          )}

          {fdaResult.status === "found" && fdaResult.drugBrand && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold">
                FDA
              </span>
              <span className="text-[10px] text-foreground/70">
                {fdaResult.drugBrand}
                {fdaResult.approvalDate &&
                  ` · Approved ${fdaResult.approvalDate}`}
              </span>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground/50">
            {info.lastChecked > 0 &&
              `Last checked: ${new Date(info.lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={copyLinks}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Copy all source links"
            data-ocid="patent-tracker.patent.copy_links_button"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRefresh(info.patentNumber)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Refresh data"
            disabled={info.loading}
            data-ocid="patent-tracker.patent.refresh_button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${info.loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onDelete(info.patentNumber)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove patent"
            data-ocid="patent-tracker.patent.delete_button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-accent/30 text-muted-foreground transition-colors"
            title="View all sources"
            data-ocid="patent-tracker.patent.expand_button"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border/30 pt-3 bg-muted/20">
              <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                All Sources — {drugName} · {info.patentNumber}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(Object.keys(info.sources) as PatentSourceKey[]).map((k) => (
                  <SourceCard key={k} sourceKey={k} result={info.sources[k]} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── New Arrivals Panel ───────────────────────────────────────────────────────

function NewArrivalsPanel({ drugName }: { drugName: string }) {
  const [results, setResults] = useState<
    Array<{
      patentNumber: string;
      title: string;
      date: string;
      assignee?: string;
      source: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchNewArrivals(drugName);
      setResults(data);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [drugName]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  return (
    <div className="rounded-xl border border-amber-200/60 dark:border-amber-700/30 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200/60 dark:border-amber-700/30">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          New Arrivals (last 30 days) — "{drugName}"
        </span>
        <button
          type="button"
          onClick={doSearch}
          className="ml-auto text-amber-700 dark:text-amber-300 hover:opacity-70"
          title="Refresh"
          data-ocid="patent-tracker.new-arrivals.refresh_button"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !fetched ? (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-700/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching USPTO + FDA for recent filings on "{drugName}"…
        </div>
      ) : results.length === 0 ? (
        <p
          className="text-xs text-amber-700/60 dark:text-amber-400/60 px-3 py-2"
          data-ocid="patent-tracker.new-arrivals.empty_state"
        >
          No new patent filings or FDA applications found in the last 30 days.
        </p>
      ) : (
        <div className="divide-y divide-amber-200/40 dark:divide-amber-700/20">
          {results.map((r, i) => (
            <div
              key={`${r.patentNumber}-${i}`}
              className="flex items-start gap-2 px-3 py-2"
              data-ocid="patent-tracker.new-arrival.row"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-200/60 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300">
                    {r.source}
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {r.patentNumber}
                  </span>
                  {r.date && (
                    <span className="text-[10px] text-muted-foreground">
                      {r.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/70 line-clamp-1">
                  {r.title}
                </p>
                {r.assignee && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {r.assignee}
                  </p>
                )}
              </div>
              <a
                href={buildGooglePatentsUrl(r.patentNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 flex-shrink-0"
                data-ocid="patent-tracker.new-arrival.link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Auto-fetch hook ──────────────────────────────────────────────────────────

function useAutoFetchPatents(
  selectedFolderId: string | null,
  folders: DrugFolder[],
  setInfoMap: React.Dispatch<React.SetStateAction<Record<string, PatentInfo>>>,
) {
  const infoRef = useRef<Record<string, PatentInfo>>({});

  const syncInfo = useCallback(
    (
      updater: (prev: Record<string, PatentInfo>) => Record<string, PatentInfo>,
    ) => {
      setInfoMap((prev) => {
        const next = updater(prev);
        infoRef.current = next;
        return next;
      });
    },
    [setInfoMap],
  );

  useEffect(() => {
    if (!selectedFolderId) return;
    const folder = folders.find((f) => f.id === selectedFolderId);
    if (!folder) return;

    const current = infoRef.current;
    const missing = folder.patentNumbers.filter(
      (pn) => !current[pn] || current[pn].loading,
    );
    if (missing.length === 0) return;

    const toFetch: string[] = [];
    const fromCache: PatentInfo[] = [];
    for (const pn of missing) {
      const cached = loadCachedPatent(pn);
      if (cached) {
        fromCache.push(cached);
      } else {
        toFetch.push(pn);
      }
    }

    if (fromCache.length > 0) {
      syncInfo((prev) => {
        const next = { ...prev };
        for (const info of fromCache) next[info.patentNumber] = info;
        return next;
      });
    }

    if (toFetch.length > 0) {
      syncInfo((prev) => {
        const next = { ...prev };
        for (const pn of toFetch) {
          if (next[pn]?.loading) continue;
          const primarySource = detectPrimarySource(pn);
          next[pn] = {
            patentNumber: pn,
            primarySource,
            sources: buildAllSources(pn, folder.name),
            lastChecked: 0,
            loading: true,
          };
        }
        return next;
      });

      Promise.allSettled(
        toFetch.map((pn) => fetchPatentInfo(pn, folder.name)),
      ).then((results) => {
        syncInfo((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === "fulfilled") {
              next[r.value.patentNumber] = { ...r.value, loading: false };
              saveCachedPatent(r.value);
            }
          }
          return next;
        });
      });
    }
  }, [selectedFolderId, folders, syncInfo]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatentTrackerTab() {
  const [folders, setFolders] = useState<DrugFolder[]>(loadFolders);
  const [trackedIds, setTrackedIds] = useState<string[]>(loadTracked);
  const [infoMap, setInfoMap] = useState<Record<string, PatentInfo>>({});

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderSearch, setFolderSearch] = useState("");

  const [newPatentNumber, setNewPatentNumber] = useState("");
  const [addingPatent, setAddingPatent] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("All");
  const [sortType] = useState<SortType>("added");

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;

  useEffect(() => {
    saveFolders(folders);
  }, [folders]);
  useEffect(() => {
    saveTracked(trackedIds);
  }, [trackedIds]);
  useAutoFetchPatents(selectedFolderId, folders, setInfoMap);

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`Folder "${name}" already exists`);
      return;
    }
    const folder: DrugFolder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      patentNumbers: [],
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, folder]);
    setNewFolderName("");
    setShowNewFolder(false);
    setSelectedFolderId(folder.id);
    toast.success(`Drug folder "${name}" created`);
  };

  const deleteFolder = (id: string) => {
    const f = folders.find((x) => x.id === id);
    setFolders((prev) => prev.filter((x) => x.id !== id));
    setTrackedIds((prev) => prev.filter((x) => x !== id));
    if (selectedFolderId === id) setSelectedFolderId(null);
    toast.success(`Folder "${f?.name ?? ""}" deleted`);
  };

  const addPatent = async () => {
    if (!selectedFolder) return;
    const pn = normalizePatentNumber(newPatentNumber.trim());
    if (!pn) return;

    if (selectedFolder.patentNumbers.includes(pn)) {
      toast.error(`Patent ${pn} is already in this folder`);
      return;
    }
    const otherFolder = folders.find(
      (f) => f.id !== selectedFolderId && f.patentNumbers.includes(pn),
    );
    if (otherFolder) {
      toast.warning(
        `Patent ${pn} already exists in folder "${otherFolder.name}"`,
        { duration: 4000 },
      );
    }

    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedFolderId
          ? { ...f, patentNumbers: [...f.patentNumbers, pn] }
          : f,
      ),
    );
    setNewPatentNumber("");

    const primarySource = detectPrimarySource(pn);
    setInfoMap((prev) => ({
      ...prev,
      [pn]: {
        patentNumber: pn,
        primarySource,
        sources: buildAllSources(pn, selectedFolder.name),
        lastChecked: 0,
        loading: true,
      },
    }));

    setAddingPatent(true);
    try {
      const info = await fetchPatentInfo(pn, selectedFolder.name);
      setInfoMap((prev) => ({ ...prev, [pn]: { ...info, loading: false } }));
      saveCachedPatent(info);
      const title = info.sources.USPTO.title;
      toast.success(
        title
          ? `"${title.substring(0, 50)}${title.length > 50 ? "…" : ""}" loaded`
          : `Patent ${pn} added`,
      );
    } catch {
      toast.error(`Could not fetch data for ${pn} — check sources manually`);
    } finally {
      setAddingPatent(false);
    }
  };

  const deletePatent = (pn: string) => {
    if (!selectedFolderId) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedFolderId
          ? { ...f, patentNumbers: f.patentNumbers.filter((x) => x !== pn) }
          : f,
      ),
    );
    setInfoMap((prev) => {
      const next = { ...prev };
      delete next[pn];
      return next;
    });
    toast.success(`Patent ${pn} removed`);
  };

  const refreshPatent = async (pn: string) => {
    const primarySource = detectPrimarySource(pn);
    localStorage.removeItem(`patentCache_${pn}`);
    setInfoMap((prev) => ({
      ...prev,
      [pn]: {
        ...(prev[pn] ?? {
          patentNumber: pn,
          primarySource,
          sources: buildAllSources(pn, selectedFolder?.name ?? ""),
          lastChecked: 0,
        }),
        loading: true,
      },
    }));
    const info = await fetchPatentInfo(pn, selectedFolder?.name ?? "");
    setInfoMap((prev) => ({ ...prev, [pn]: { ...info, loading: false } }));
    saveCachedPatent(info);
    toast.success(`Patent ${pn} refreshed`);
  };

  const refreshAll = async () => {
    if (!selectedFolder) return;
    const pns = selectedFolder.patentNumbers;
    if (pns.length === 0) return;
    for (const pn of pns) localStorage.removeItem(`patentCache_${pn}`);
    setInfoMap((prev) => {
      const next = { ...prev };
      for (const pn of pns) {
        next[pn] = {
          ...(prev[pn] ?? {
            patentNumber: pn,
            primarySource: detectPrimarySource(pn),
            sources: buildAllSources(pn, selectedFolder.name),
            lastChecked: 0,
          }),
          loading: true,
        };
      }
      return next;
    });
    const results = await Promise.allSettled(
      pns.map((pn) => fetchPatentInfo(pn, selectedFolder.name)),
    );
    setInfoMap((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === "fulfilled") {
          next[r.value.patentNumber] = { ...r.value, loading: false };
          saveCachedPatent(r.value);
        }
      }
      return next;
    });
    toast.success(`All patents in "${selectedFolder.name}" refreshed`);
  };

  const toggleTrack = (folderId: string) => {
    setTrackedIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((x) => x !== folderId)
        : [...prev, folderId],
    );
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(folderSearch.toLowerCase()),
  );

  const filteredPatents = selectedFolder
    ? selectedFolder.patentNumbers
        .filter((pn) => {
          if (filterType === "All") return true;
          const src = detectPrimarySource(pn);
          return filterType === "US"
            ? src === "USPTO" || src === "Unknown"
            : filterType === "EP"
              ? src === "EPO"
              : filterType === "JP"
                ? src === "JP"
                : filterType === "CN"
                  ? src === "CN"
                  : filterType === "KR"
                    ? src === "KR"
                    : filterType === "WO"
                      ? src === "WO"
                      : true;
        })
        .sort((a, b) => {
          if (sortType === "number") return a.localeCompare(b);
          return 0;
        })
    : [];

  const FILTER_OPTIONS: FilterType[] = [
    "All",
    "US",
    "EP",
    "JP",
    "CN",
    "KR",
    "WO",
  ];

  return (
    <div
      className="h-full flex flex-col bg-background"
      data-ocid="patent-tracker.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0 bg-card">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Patent Tracker</h1>
          <p className="text-xs text-muted-foreground">
            Live data from USPTO · FDA · 7 global databases
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] border-primary/30 text-primary/70"
          >
            9 Sources
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {folders.length} Drug{folders.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Body — two-column layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel */}
        <div className="w-60 flex-shrink-0 border-r border-border/40 flex flex-col bg-card">
          <div className="p-2 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Search drugs…"
                className="pl-8 h-8 text-xs"
                data-ocid="patent-tracker.folder.search_input"
              />
            </div>
          </div>

          <div className="p-2 border-b border-border/30">
            <AnimatePresence mode="wait">
              {showNewFolder ? (
                <motion.div
                  key="new-input"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-1"
                >
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Drug name…"
                    className="h-8 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                    data-ocid="patent-tracker.folder.input"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={createFolder}
                    data-ocid="patent-tracker.folder.submit_button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setShowNewFolder(false)}
                    data-ocid="patent-tracker.folder.cancel_button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="new-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  onClick={() => setShowNewFolder(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
                  data-ocid="patent-tracker.folder.open_modal_button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Drug Folder
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
              {filteredFolders.length === 0 && (
                <div
                  className="text-xs text-muted-foreground text-center py-6"
                  data-ocid="patent-tracker.folders.empty_state"
                >
                  {folders.length === 0
                    ? "No folders yet. Create one above."
                    : "No matching folders."}
                </div>
              )}
              <AnimatePresence>
                {filteredFolders.map((folder, idx) => {
                  const isSelected = folder.id === selectedFolderId;
                  const isTracked = trackedIds.includes(folder.id);
                  return (
                    <motion.div
                      key={folder.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "hover:bg-accent/40 text-foreground"
                      }`}
                      onClick={() =>
                        setSelectedFolderId(isSelected ? null : folder.id)
                      }
                      data-ocid={`patent-tracker.folder.item.${idx + 1}`}
                    >
                      {isSelected ? (
                        <FolderOpen className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                      )}
                      <span className="flex-1 text-xs font-medium truncate">
                        {folder.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {folder.patentNumbers.length}
                      </span>
                      {isTracked && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                          title="Tracked"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        title="Delete folder"
                        data-ocid={`patent-tracker.folder.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <ChevronRight
                        className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${isSelected ? "rotate-90 text-primary" : "text-muted-foreground/40"}`}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedFolder ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
              data-ocid="patent-tracker.patents.empty_state"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileSearch className="w-8 h-8 text-primary/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Select a Drug Folder
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Choose a drug folder on the left to view and track its patents
                  across 9 global databases, or create a new folder to get
                  started.
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-muted/30 p-4 max-w-sm text-left space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  How to use:
                </p>
                <p className="text-[11px] text-muted-foreground">
                  1. Create a folder with your drug name (e.g. "Ibuprofen")
                </p>
                <p className="text-[11px] text-muted-foreground">
                  2. Add patent numbers: US10000000, EP1234567, JP2020123456
                </p>
                <p className="text-[11px] text-muted-foreground">
                  3. Live data fetched from USPTO &amp; FDA automatically
                </p>
                <p className="text-[11px] text-muted-foreground">
                  4. Toggle "Track" to get daily updates on the Dashboard
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {(
                  [
                    "USPTO",
                    "FDA",
                    "Espacenet",
                    "PMDA",
                    "NMPA",
                    "WIPO",
                  ] as PatentSourceKey[]
                ).map((k) => (
                  <span
                    key={k}
                    className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    {SOURCE_META[k].flag} {SOURCE_META[k].label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0 bg-card/50">
                <FolderOpen className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-foreground">
                    {selectedFolder.name}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {filteredPatents.length} patent
                    {filteredPatents.length !== 1 ? "s" : ""} · live data from
                    USPTO & FDA
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 gap-1.5 text-xs"
                  onClick={refreshAll}
                  title="Refresh all patents in this folder"
                  data-ocid="patent-tracker.refresh_all_button"
                >
                  <RefreshCw className="h-3 w-3" />
                  Check All
                </Button>
                <button
                  type="button"
                  onClick={() => toggleTrack(selectedFolder.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    trackedIds.includes(selectedFolder.id)
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                  data-ocid="patent-tracker.track.toggle"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${trackedIds.includes(selectedFolder.id) ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                  {trackedIds.includes(selectedFolder.id)
                    ? "Tracking"
                    : "Track"}
                </button>
              </div>

              {/* Add patent + filter bar */}
              <div className="flex flex-col gap-2 px-4 py-2 border-b border-border/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={newPatentNumber}
                    onChange={(e) => setNewPatentNumber(e.target.value)}
                    placeholder="Add patent: US12345678, EP1234567, JP6000000, CN112345678…"
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPatent();
                    }}
                    data-ocid="patent-tracker.patent.input"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 gap-1.5 text-xs flex-shrink-0"
                    onClick={addPatent}
                    disabled={addingPatent || !newPatentNumber.trim()}
                    data-ocid="patent-tracker.patent.submit_button"
                  >
                    {addingPatent ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add
                  </Button>
                </div>
                {/* Filter bar */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex gap-1 flex-wrap">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFilterType(opt)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                          filterType === opt
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                        data-ocid={`patent-tracker.filter.${opt.toLowerCase()}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patent list */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  <NewArrivalsPanel drugName={selectedFolder.name} />
                  <Separator className="my-2" />

                  {filteredPatents.length === 0 ? (
                    <div
                      className="flex flex-col items-center gap-3 py-10 text-center"
                      data-ocid="patent-tracker.patent-list.empty_state"
                    >
                      <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          No patents in this folder
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {filterType !== "All"
                            ? `No ${filterType} patents. Change the filter or add one above.`
                            : "Type a patent number above and press Enter or click Add."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredPatents.map((pn) => {
                        const info = infoMap[pn] ?? {
                          patentNumber: pn,
                          primarySource: detectPrimarySource(pn),
                          sources: buildAllSources(pn, selectedFolder.name),
                          lastChecked: 0,
                          loading: true,
                        };
                        return (
                          <PatentRow
                            key={pn}
                            info={info}
                            drugName={selectedFolder.name}
                            onRefresh={refreshPatent}
                            onDelete={deletePatent}
                          />
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
