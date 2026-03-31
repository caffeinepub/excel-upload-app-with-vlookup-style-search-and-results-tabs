import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface DrugData {
  imageUrl: string;
  imageName: string;
  status: "idle" | "detecting" | "fetching" | "done" | "error" | "manual";
  smiles?: string;
  manualName?: string;
  pubchemCID?: number;
  name?: string;
  iupacName?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSMILES?: string;
  synonyms?: string[];
  description?: string;
  xlogp?: number;
  complexity?: number;
  hbondDonors?: number;
  hbondAcceptors?: number;
  rotatableBonds?: number;
}

const EMPTY_DRUG: DrugData = {
  imageUrl: "",
  imageName: "",
  status: "idle",
};

async function fetchPubChemBySmiles(
  smiles: string,
): Promise<Partial<DrugData>> {
  const encoded = encodeURIComponent(smiles);
  const res = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encoded}/JSON`,
  );
  if (!res.ok) throw new Error("PubChem SMILES lookup failed");
  return parsePubChemResponse(await res.json());
}

async function fetchPubChemByName(name: string): Promise<Partial<DrugData>> {
  const encoded = encodeURIComponent(name);
  const res = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/JSON`,
  );
  if (!res.ok) throw new Error("PubChem name lookup failed");
  return parsePubChemResponse(await res.json());
}

function getPropValue(
  props: {
    urn: { label: string; name?: string };
    value: Record<string, unknown>;
  }[],
  label: string,
  name?: string,
): string | number | undefined {
  const found = props.find(
    (p) => p.urn.label === label && (name === undefined || p.urn.name === name),
  );
  if (!found) return undefined;
  return (
    (found.value.sval as string) ??
    (found.value.fval as number) ??
    (found.value.ival as number)
  );
}

function parsePubChemResponse(json: unknown): Partial<DrugData> {
  const compound = (
    json as {
      PC_Compounds: {
        id: { id: { cid: number } };
        props: {
          urn: { label: string; name?: string };
          value: Record<string, unknown>;
        }[];
      }[];
    }
  ).PC_Compounds?.[0];
  if (!compound) throw new Error("No compound found");
  const props = compound.props ?? [];
  const cid = compound.id?.id?.cid;

  const iupacName = getPropValue(props, "IUPAC Name", "Preferred") as string;
  const molecularFormula = getPropValue(props, "Molecular Formula") as string;
  const molecularWeight = getPropValue(props, "Molecular Weight") as string;
  const canonicalSMILES = getPropValue(props, "SMILES", "Canonical") as string;
  const xlogp = getPropValue(props, "Log P") as number;
  const complexity = getPropValue(props, "Complexity") as number;
  const hbondDonors = getPropValue(
    props,
    "Count",
    "Hydrogen Bond Donor",
  ) as number;
  const hbondAcceptors = getPropValue(
    props,
    "Count",
    "Hydrogen Bond Acceptor",
  ) as number;
  const rotatableBonds = getPropValue(
    props,
    "Count",
    "Rotatable Bond",
  ) as number;

  const synonymProp = props.find(
    (p) => p.urn.label === "IUPAC Name" && p.urn.name === "Traditional",
  );
  const synonyms: string[] = synonymProp
    ? [synonymProp.value.sval as string]
    : [];

  return {
    pubchemCID: cid,
    name: iupacName ?? molecularFormula ?? `CID ${cid}`,
    iupacName,
    molecularFormula,
    molecularWeight: molecularWeight?.toString(),
    canonicalSMILES,
    synonyms,
    xlogp: xlogp ?? undefined,
    complexity: complexity ?? undefined,
    hbondDonors: hbondDonors ?? undefined,
    hbondAcceptors: hbondAcceptors ?? undefined,
    rotatableBonds: rotatableBonds ?? undefined,
  };
}

async function fetchDescription(cid: number): Promise<string> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`,
    );
    if (!res.ok) return "";
    const json = (await res.json()) as {
      InformationList: { Information: { Description?: string }[] };
    };
    const info = json.InformationList?.Information ?? [];
    return info.find((i) => i.Description)?.Description ?? "";
  } catch {
    return "";
  }
}

function computeSimilarity(a: DrugData, b: DrugData): number {
  let score = 0;
  let total = 0;

  const numProps: (keyof DrugData)[] = [
    "xlogp",
    "complexity",
    "hbondDonors",
    "hbondAcceptors",
    "rotatableBonds",
  ];
  for (const key of numProps) {
    const av = a[key] as number | undefined;
    const bv = b[key] as number | undefined;
    if (av !== undefined && bv !== undefined) {
      total += 1;
      const max = Math.max(Math.abs(av), Math.abs(bv), 1);
      score += 1 - Math.min(Math.abs(av - bv) / max, 1);
    }
  }

  if (a.molecularFormula && b.molecularFormula) {
    total += 2;
    const af = a.molecularFormula;
    const bf = b.molecularFormula;
    if (af === bf) score += 2;
    else {
      const common = [...af].filter((c) => bf.includes(c)).length;
      score += (common / Math.max(af.length, bf.length)) * 2;
    }
  }

  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function SimilarityRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        aria-label="Similarity score"
      >
        <title>Structural Similarity</title>
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text
          x="48"
          y="54"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={color}
        >
          {score}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">
        Structural Similarity
      </span>
    </div>
  );
}

function UploadZone({
  label,
  drug,
  onImageUpload,
  onManualName,
  onClear,
}: {
  label: string;
  drug: DrugData;
  onImageUpload: (file: File) => void;
  onManualName: (name: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onImageUpload(file);
    },
    [onImageUpload],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageUpload(file);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/20 ring-1 ring-teal-500/40">
          <FlaskConical className="h-3.5 w-3.5 text-teal-400" />
        </div>
        <h3 className="font-semibold text-sm text-foreground">{label}</h3>
      </div>

      {drug.status === "idle" ? (
        <button
          type="button"
          data-ocid="drug_analyzer.dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all min-h-[180px] ${
            dragOver
              ? "border-teal-400 bg-teal-500/10 scale-[1.01]"
              : "border-border bg-muted/50 hover:border-teal-500/60 hover:bg-muted"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-5 w-5 text-teal-400" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-medium text-foreground">
              Drop image here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, SVG, TIFF accepted
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            data-ocid="drug_analyzer.upload_button"
          />
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-border bg-card">
          {drug.imageUrl && (
            <img
              src={drug.imageUrl}
              alt="Drug structure"
              className="w-full h-40 object-contain bg-white/5 p-2"
            />
          )}
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 hover:bg-red-500/80 transition-colors"
            data-ocid="drug_analyzer.close_button"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {drug.status === "detecting" && (
                <Badge
                  variant="outline"
                  className="text-teal-400 border-teal-500/40 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Identifying structure…
                </Badge>
              )}
              {drug.status === "fetching" && (
                <Badge
                  variant="outline"
                  className="text-blue-400 border-blue-500/40 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Fetching data…
                </Badge>
              )}
              {drug.status === "done" && (
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                  ✓ {drug.name ?? "Identified"}
                </Badge>
              )}
              {drug.status === "error" && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" /> Error
                </Badge>
              )}
              {drug.status === "manual" && (
                <Badge
                  variant="outline"
                  className="text-amber-400 border-amber-500/40 text-xs"
                >
                  Manual Entry
                </Badge>
              )}
            </div>

            {/* Fix 3: Better manual entry prominence */}
            {drug.status === "manual" && (
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-300">
                        Auto-identification failed
                      </p>
                      <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
                        The image structure could not be automatically
                        recognized. Please enter the drug name manually below:
                      </p>
                    </div>
                  </div>
                </div>
                <Input
                  placeholder="e.g. Aspirin, Caffeine, Ibuprofen…"
                  defaultValue={drug.manualName ?? ""}
                  onBlur={(e) => onManualName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      onManualName((e.target as HTMLInputElement).value);
                  }}
                  className="bg-input border-amber-500/40 text-sm h-8 focus:border-amber-400"
                  data-ocid="drug_analyzer.input"
                />
              </div>
            )}

            {drug.status === "error" && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Auto-identification unavailable. Enter drug name manually:
                </p>
                <Input
                  placeholder="e.g. Aspirin, Caffeine, Ibuprofen…"
                  defaultValue={drug.manualName ?? ""}
                  onBlur={(e) => onManualName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      onManualName((e.target as HTMLInputElement).value);
                  }}
                  className="bg-input border-border text-sm h-8"
                  data-ocid="drug_analyzer.input"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
}: {
  label: string;
  a: string | number | undefined;
  b: string | number | undefined;
}) {
  const match =
    a !== undefined &&
    b !== undefined &&
    String(a).toLowerCase() === String(b).toLowerCase();
  const similar =
    !match &&
    a !== undefined &&
    b !== undefined &&
    typeof a === "number" &&
    typeof b === "number" &&
    Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) < 0.2;

  const cellBase = "px-3 py-2";
  const highlight = match
    ? "bg-teal-500/10 text-teal-300"
    : similar
      ? "bg-amber-500/10 text-amber-300"
      : "text-foreground";

  // Fix 1: Updated truncation thresholds (18 for SMILES, 28 for others)
  const format = (v: string | number | undefined) => {
    if (v === undefined)
      return <span className="text-muted-foreground italic">—</span>;
    const truncLimit = label === "Canonical SMILES" ? 18 : 28;
    if (typeof v === "string" && v.length > truncLimit) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dashed border-muted-foreground break-all text-xs leading-relaxed">
                {v.slice(0, truncLimit)}…
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs break-all">{v}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <span className="break-all text-xs leading-relaxed">{String(v)}</span>
    );
  };

  return (
    <TableRow className="border-border/50 hover:bg-muted/30">
      <td className="px-3 py-2 text-xs font-medium text-muted-foreground w-36">
        {label}
      </td>
      <td className={`${cellBase} ${highlight} w-[calc(50%-72px)]`}>
        {format(a)}
      </td>
      <td
        className={`${cellBase} ${highlight} border-l border-border/50 w-[calc(50%-72px)]`}
      >
        {format(b)}
      </td>
    </TableRow>
  );
}

function TableRow({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return <tr className={className}>{children}</tr>;
}

export default function DrugAnalyzerTab() {
  const [drugA, setDrugA] = useState<DrugData>(EMPTY_DRUG);
  const [drugB, setDrugB] = useState<DrugData>(EMPTY_DRUG);
  const [analyzed, setAnalyzed] = useState(false);

  const updateDrug = (
    setter: React.Dispatch<React.SetStateAction<DrugData>>,
    patch: Partial<DrugData>,
  ) => setter((prev) => ({ ...prev, ...patch }));

  // Fix 2: Improved DECIMER image recognition with multiple fallback approaches
  const processImage = async (
    setter: React.Dispatch<React.SetStateAction<DrugData>>,
    file: File,
  ) => {
    const imageUrl = URL.createObjectURL(file);
    updateDrug(setter, { imageUrl, imageName: file.name, status: "detecting" });
    setAnalyzed(false);

    let smiles: string | undefined;

    const isValidSmiles = (s: string) =>
      s.trim().length >= 3 && !/error/i.test(s) && /[A-Za-z]/.test(s);

    const parseSmiles = (text: string): string | undefined => {
      try {
        const j = JSON.parse(text);
        const candidate =
          j.smiles ??
          j.SMILES ??
          j.result ??
          (typeof j === "string" ? j : undefined);
        return typeof candidate === "string" ? candidate.trim() : undefined;
      } catch {
        return text.trim() || undefined;
      }
    };

    // Attempt 1: DECIMER primary endpoint with FormData key "input"
    if (!smiles) {
      try {
        const formData = new FormData();
        formData.append("input", file);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch("https://decimer.ai/api/predict", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const candidate = parseSmiles(await res.text());
          if (candidate && isValidSmiles(candidate)) smiles = candidate;
        }
      } catch {
        // fall through
      }
    }

    // Attempt 2: DECIMER alternate endpoint with FormData key "file"
    if (!smiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch("https://api.decimer.ai/predict", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const candidate = parseSmiles(await res.text());
          if (candidate && isValidSmiles(candidate)) smiles = candidate;
        }
      } catch {
        // fall through
      }
    }

    // Attempt 3: base64 JSON POST to DECIMER primary endpoint
    if (!smiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch("https://decimer.ai/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const candidate = parseSmiles(await res.text());
          if (candidate && isValidSmiles(candidate)) smiles = candidate;
        }
      } catch {
        // all attempts exhausted
      }
    }

    if (!smiles) {
      updateDrug(setter, { status: "manual" });
      return;
    }

    updateDrug(setter, { smiles, status: "fetching" });

    try {
      const data = await fetchPubChemBySmiles(smiles);
      const description = data.pubchemCID
        ? await fetchDescription(data.pubchemCID)
        : "";
      updateDrug(setter, { ...data, description, status: "done" });
    } catch {
      updateDrug(setter, { status: "manual" });
    }
  };

  const processManualName = async (
    setter: React.Dispatch<React.SetStateAction<DrugData>>,
    name: string,
  ) => {
    if (!name.trim()) return;
    updateDrug(setter, { manualName: name, status: "fetching" });
    try {
      const data = await fetchPubChemByName(name);
      const description = data.pubchemCID
        ? await fetchDescription(data.pubchemCID)
        : "";
      updateDrug(setter, { ...data, description, status: "done" });
    } catch {
      updateDrug(setter, { status: "error", manualName: name });
    }
  };

  const bothDone = drugA.status === "done" && drugB.status === "done";
  const similarity = bothDone ? computeSimilarity(drugA, drugB) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 ring-1 ring-teal-500/40">
              <FlaskConical className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Drug Structure Analyzer
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload drug structure images to auto-identify and compare
                compounds
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 overflow-hidden">
        {/* Upload Zones */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">
              Upload Drug Structure Images
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              The analyzer will auto-identify each compound via DECIMER and
              fetch full data from PubChem.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-col sm:flex-row">
              <UploadZone
                label="Drug A"
                drug={drugA}
                onImageUpload={(f) => processImage(setDrugA, f)}
                onManualName={(n) => processManualName(setDrugA, n)}
                onClear={() => {
                  setDrugA(EMPTY_DRUG);
                  setAnalyzed(false);
                }}
              />
              <div className="hidden sm:flex items-center">
                <div className="h-full w-px bg-border" />
              </div>
              <UploadZone
                label="Drug B"
                drug={drugB}
                onImageUpload={(f) => processImage(setDrugB, f)}
                onManualName={(n) => processManualName(setDrugB, n)}
                onClear={() => {
                  setDrugB(EMPTY_DRUG);
                  setAnalyzed(false);
                }}
              />
            </div>

            {bothDone && !analyzed && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setAnalyzed(true)}
                  className="bg-teal-600 hover:bg-teal-500 text-white gap-2 px-8"
                  data-ocid="drug_analyzer.primary_button"
                >
                  <FlaskConical className="h-4 w-4" />
                  Analyze & Compare
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix 4: Results section with space-y-8 */}
        {analyzed && bothDone && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Similarity + Drug Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <DrugHeaderCard drug={drugA} label="Drug A" />
              <div className="flex flex-col items-center justify-center py-4">
                <SimilarityRing score={similarity} />
              </div>
              <DrugHeaderCard drug={drugB} label="Drug B" />
            </div>

            <Separator className="border-border" />

            {/* Fix 1 + Fix 4: Comparison Table with overflow protection */}
            <Card className="bg-card border-border w-full overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground">
                  Side-by-Side Comparison
                </CardTitle>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded bg-teal-500" />{" "}
                    Match
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded bg-amber-500" />{" "}
                    Similar
                  </span>
                </div>
              </CardHeader>
              {/* Fix 1: overflow-hidden + table-fixed */}
              <CardContent className="p-0 overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full table-fixed min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-36">
                          Property
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-teal-400 w-[calc(50%-72px)]">
                          {drugA.name ?? "Drug A"}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-400 border-l border-border/50 w-[calc(50%-72px)]">
                          {drugB.name ?? "Drug B"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      <CompareRow
                        label="IUPAC Name"
                        a={drugA.iupacName}
                        b={drugB.iupacName}
                      />
                      <CompareRow
                        label="Molecular Formula"
                        a={drugA.molecularFormula}
                        b={drugB.molecularFormula}
                      />
                      <CompareRow
                        label="Molecular Weight"
                        a={drugA.molecularWeight}
                        b={drugB.molecularWeight}
                      />
                      <CompareRow
                        label="Canonical SMILES"
                        a={drugA.canonicalSMILES}
                        b={drugB.canonicalSMILES}
                      />
                      <CompareRow
                        label="XLogP (Lipophilicity)"
                        a={drugA.xlogp}
                        b={drugB.xlogp}
                      />
                      <CompareRow
                        label="Complexity"
                        a={drugA.complexity}
                        b={drugB.complexity}
                      />
                      <CompareRow
                        label="H-Bond Donors"
                        a={drugA.hbondDonors}
                        b={drugB.hbondDonors}
                      />
                      <CompareRow
                        label="H-Bond Acceptors"
                        a={drugA.hbondAcceptors}
                        b={drugB.hbondAcceptors}
                      />
                      <CompareRow
                        label="Rotatable Bonds"
                        a={drugA.rotatableBonds}
                        b={drugB.rotatableBonds}
                      />
                      <CompareRow
                        label="PubChem CID"
                        a={drugA.pubchemCID}
                        b={drugB.pubchemCID}
                      />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Fix 5: Descriptions with proper text formatting */}
            {(drugA.description || drugB.description) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    { drug: drugA, lbl: "Drug A" },
                    { drug: drugB, lbl: "Drug B" },
                  ] as const
                ).map(({ drug, lbl }) =>
                  drug.description ? (
                    <Card key={lbl} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-foreground">
                          {drug.name ?? lbl} — Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {drug.description}
                        </p>
                      </CardContent>
                    </Card>
                  ) : null,
                )}
              </div>
            )}

            {/* PubChem Links */}
            <div className="flex flex-wrap gap-3 justify-center">
              {(
                [
                  { drug: drugA, lbl: "Drug A" },
                  { drug: drugB, lbl: "Drug B" },
                ] as const
              ).map(({ drug, lbl }) =>
                drug.pubchemCID ? (
                  <a
                    key={drug.pubchemCID}
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${drug.pubchemCID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="drug_analyzer.link"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-muted-foreground hover:text-teal-400 hover:border-teal-500/50 gap-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View {drug.name ?? lbl} on PubChem
                    </Button>
                  </a>
                ) : null,
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-500 hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function DrugHeaderCard({ drug, label }: { drug: DrugData; label: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <h3 className="font-bold text-foreground text-sm leading-tight">
              {drug.name ?? "Unknown"}
            </h3>
          </div>
          {drug.pubchemCID && (
            <Badge
              variant="outline"
              className="text-[10px] border-border text-muted-foreground shrink-0"
            >
              CID {drug.pubchemCID}
            </Badge>
          )}
        </div>
        {drug.molecularFormula && (
          <Badge className="bg-teal-500/15 text-teal-300 border-teal-500/30 font-mono text-xs">
            {drug.molecularFormula}
          </Badge>
        )}
        {drug.molecularWeight && (
          <p className="text-xs text-muted-foreground">
            MW:{" "}
            <span className="text-foreground font-medium">
              {drug.molecularWeight}
            </span>{" "}
            g/mol
          </p>
        )}
        {drug.iupacName && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {drug.iupacName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
