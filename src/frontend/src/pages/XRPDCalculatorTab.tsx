import { Button } from "@/components/ui/button";
import {
  Atom,
  ClipboardCopy,
  Download,
  RefreshCw,
  Upload,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface XRPDPeak {
  index: number;
  twotheta: number;
  relIntensity: number;
}

// ─── Canvas-Based Peak Detection ─────────────────────────────────────────────

function detectPeaksFromCanvas(
  canvas: HTMLCanvasElement,
  minTwoTheta: number,
  maxTwoTheta: number,
): XRPDPeak[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const DARK_THRESHOLD = 80;

  function isBrightAt(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const idx = (y * width + x) * 4;
    const r = data[idx] ?? 255;
    const g = data[idx + 1] ?? 255;
    const b = data[idx + 2] ?? 255;
    return (r + g + b) / 3 > 200;
  }

  function colDarkness(x: number): number {
    let count = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx] ?? 255;
      const g = data[idx + 1] ?? 255;
      const b = data[idx + 2] ?? 255;
      if ((r + g + b) / 3 < DARK_THRESHOLD) count++;
    }
    return count;
  }

  function rowDarkness(y: number): number {
    let count = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx] ?? 255;
      const g = data[idx + 1] ?? 255;
      const b = data[idx + 2] ?? 255;
      if ((r + g + b) / 3 < DARK_THRESHOLD) count++;
    }
    return count;
  }

  let plotLeft = Math.round(width * 0.08);
  for (let x = Math.round(width * 0.05); x < Math.round(width * 0.25); x++) {
    if (colDarkness(x) > height * 0.3) {
      plotLeft = x;
      break;
    }
  }

  let plotRight = Math.round(width * 0.95);
  for (let x = width - 1; x > Math.round(width * 0.7); x--) {
    if (colDarkness(x) > height * 0.3) {
      plotRight = x;
      break;
    }
  }

  let plotBottom = Math.round(height * 0.88);
  for (let y = height - 1; y > Math.round(height * 0.5); y--) {
    if (rowDarkness(y) > width * 0.3) {
      plotBottom = y;
      break;
    }
  }

  const plotTop = Math.round(height * 0.05);
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  if (plotWidth < 20 || plotHeight < 20) return [];

  const cornerBrightness = [
    isBrightAt(plotLeft + 5, plotTop + 5),
    isBrightAt(plotRight - 5, plotTop + 5),
    isBrightAt(plotLeft + 5, plotBottom - 5),
    isBrightAt(plotRight - 5, plotBottom - 5),
  ];
  const brightBg = cornerBrightness.filter(Boolean).length >= 3;

  const colSignal: number[] = [];
  for (let x = plotLeft; x <= plotRight; x++) {
    let extremeVal = brightBg ? 255 : 0;
    let extremeRow = plotBottom;
    for (let y = plotTop; y <= plotBottom; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx] ?? 255;
      const g = data[idx + 1] ?? 255;
      const b = data[idx + 2] ?? 255;
      const brightness = (r + g + b) / 3;
      if (brightBg ? brightness < extremeVal : brightness > extremeVal) {
        extremeVal = brightness;
        extremeRow = y;
      }
    }
    const intensity = plotBottom - extremeRow;
    colSignal.push(intensity);
  }

  const maxSignal = Math.max(...colSignal);
  if (maxSignal === 0) return [];

  const PROMINENCE_THRESHOLD = 0.1;
  const MIN_SEPARATION = Math.round(plotWidth * 0.01);

  const peaks: { colIdx: number; signal: number }[] = [];
  const windowHalf = Math.max(3, Math.round(plotWidth * 0.008));

  for (let i = windowHalf; i < colSignal.length - windowHalf; i++) {
    const val = colSignal[i] ?? 0;
    if (val / maxSignal < PROMINENCE_THRESHOLD) continue;

    let isMax = true;
    for (let j = i - windowHalf; j <= i + windowHalf; j++) {
      if (j !== i && (colSignal[j] ?? 0) >= val) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;

    if (
      peaks.length > 0 &&
      i - (peaks[peaks.length - 1]?.colIdx ?? 0) < MIN_SEPARATION
    ) {
      const last = peaks[peaks.length - 1];
      if (last && val > last.signal) {
        peaks[peaks.length - 1] = { colIdx: i, signal: val };
      }
      continue;
    }

    peaks.push({ colIdx: i, signal: val });
  }

  if (peaks.length === 0) return [];

  const twothetaRange = maxTwoTheta - minTwoTheta;
  const maxPeakSignal = Math.max(...peaks.map((p) => p.signal));

  const result: XRPDPeak[] = peaks.map((p, idx) => {
    const fraction = p.colIdx / (colSignal.length - 1);
    const twotheta = minTwoTheta + fraction * twothetaRange;
    const relIntensity = (p.signal / maxPeakSignal) * 100;
    return {
      index: idx + 1,
      twotheta: Math.round(twotheta * 100) / 100,
      relIntensity: Math.round(relIntensity * 10) / 10,
    };
  });

  result.sort((a, b) => a.twotheta - b.twotheta);
  result.forEach((p, i) => {
    p.index = i + 1;
  });

  return result;
}

// ─── Manual peaks builder (equal intensity) ───────────────────────────────────

function buildPeaks(twothetaValues: number[]): XRPDPeak[] {
  if (twothetaValues.length === 0) return [];
  return [...twothetaValues]
    .sort((a, b) => a - b)
    .map((tt, i) => ({ index: i + 1, twotheta: tt, relIntensity: 100 }));
}

// ─── CSV / Copy generators ────────────────────────────────────────────────────

function generateCSV(peaks: XRPDPeak[]): string {
  const header = "#,2θ (°),Intensity (%)";
  const rows = peaks.map(
    (p) => `${p.index},${p.twotheta.toFixed(2)},${p.relIntensity.toFixed(1)}`,
  );
  return [header, ...rows].join("\n");
}

function generateCopyText(peaks: XRPDPeak[]): string {
  const header = "2θ (°) | Intensity (%)";
  const rows = peaks.map(
    (p) => `${p.twotheta.toFixed(2)} | ${p.relIntensity.toFixed(1)}`,
  );
  return [header, ...rows].join("\n");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function XRPDCalculatorTab() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [peaks, setPeaks] = useState<XRPDPeak[] | null>(null);
  const [error, setError] = useState("");
  const [minTwoTheta, setMinTwoTheta] = useState("5");
  const [maxTwoTheta, setMaxTwoTheta] = useState("50");
  const [manualInput, setManualInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match(/^image\//)) {
      setError("Please upload a PNG, JPG, or TIFF image.");
      return;
    }
    setError("");
    setPeaks(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleAnalyze = useCallback(() => {
    if (!imageUrl || !canvasRef.current || !imgRef.current) return;

    const minTT = Number.parseFloat(minTwoTheta);
    const maxTT = Number.parseFloat(maxTwoTheta);
    if (
      Number.isNaN(minTT) ||
      Number.isNaN(maxTT) ||
      minTT >= maxTT ||
      minTT < 0 ||
      maxTT > 180
    ) {
      setError("Enter valid 2θ range (e.g. 5 to 50).");
      return;
    }

    setAnalyzing(true);
    setError("");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      try {
        const detected = detectPeaksFromCanvas(canvas, minTT, maxTT);
        if (detected.length === 0) {
          setError(
            "No peaks detected. Try adjusting the 2θ range or use manual input.",
          );
          setPeaks(null);
        } else {
          setPeaks(detected);
        }
      } catch {
        setError("Error analyzing image. Please try manual input instead.");
      } finally {
        setAnalyzing(false);
      }
    };
    img.onerror = () => {
      setError("Failed to load image for analysis.");
      setAnalyzing(false);
    };
    img.src = imageUrl;
  }, [imageUrl, minTwoTheta, maxTwoTheta]);

  const handleManualCalculate = () => {
    setError("");
    const parts = manualInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const values = parts
      .map(Number.parseFloat)
      .filter((v) => !Number.isNaN(v) && v > 0 && v < 180);
    if (values.length === 0) {
      setError("Enter comma-separated 2θ values (e.g. 5.24, 12.6, 18.3).");
      return;
    }
    setPeaks(buildPeaks(values));
  };

  const handleCopy = () => {
    if (!peaks) return;
    navigator.clipboard
      .writeText(generateCopyText(peaks))
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Failed to copy."));
  };

  const handleDownloadCSV = () => {
    if (!peaks) return;
    const blob = new Blob([generateCSV(peaks)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xrpd_peaks_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const handleClear = () => {
    setImageFile(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setPeaks(null);
    setError("");
    setManualInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const strongestPeak = peaks
    ? peaks.reduce(
        (a, b) => (b.relIntensity > a.relIntensity ? b : a),
        peaks[0],
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Atom className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">XRPD Calculator</h1>
          <p className="text-xs text-muted-foreground">
            X-Ray Powder Diffraction — Peak Extraction
          </p>
        </div>
      </div>

      {/* 2θ Range + Upload Panel */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-mac-soft overflow-hidden">
        <div className="bg-muted/30 border-b border-border/40 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Upload XRPD Graph
          </p>
        </div>

        {/* 2θ range inputs */}
        <div className="px-5 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              2θ Axis Range (for accurate peak mapping)
            </p>
          </div>
          <div>
            <label
              htmlFor="xrpd-min"
              className="block text-xs font-semibold text-muted-foreground mb-1.5"
            >
              Min 2θ (°)
            </label>
            <input
              id="xrpd-min"
              type="number"
              value={minTwoTheta}
              onChange={(e) => setMinTwoTheta(e.target.value)}
              placeholder="5"
              className="w-full bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              data-ocid="xrpd.min_input"
            />
          </div>
          <div>
            <label
              htmlFor="xrpd-max"
              className="block text-xs font-semibold text-muted-foreground mb-1.5"
            >
              Max 2θ (°)
            </label>
            <input
              id="xrpd-max"
              type="number"
              value={maxTwoTheta}
              onChange={(e) => setMaxTwoTheta(e.target.value)}
              placeholder="50"
              className="w-full bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              data-ocid="xrpd.max_input"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-8 px-4 ${
              dragOver
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-border/50 bg-muted/20 hover:border-indigo-400/60 hover:bg-indigo-500/5"
            }`}
            data-ocid="xrpd.upload_zone"
          >
            <Upload
              className={`w-8 h-8 ${dragOver ? "text-indigo-400" : "text-muted-foreground"}`}
            />
            <p className="text-sm font-medium text-foreground">
              {imageFile ? imageFile.name : "Drop XRPD graph here"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, TIFF — or click to browse
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.tiff,.tif"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Image preview */}
        {imageUrl && (
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Preview
            </p>
            <div className="rounded-xl overflow-hidden border border-border/30 bg-muted/20">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="XRPD graph preview"
                className="w-full max-h-64 object-contain"
                data-ocid="xrpd.preview_image"
              />
            </div>
          </div>
        )}

        {error && (
          <div
            className="mx-5 mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive"
            data-ocid="xrpd.error_state"
          >
            {error}
          </div>
        )}

        <div className="px-5 pb-5 flex flex-wrap gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={!imageUrl || analyzing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            data-ocid="xrpd.analyze_button"
          >
            {analyzing ? (
              <>
                <span className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Extract Peaks
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            data-ocid="xrpd.clear_button"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Manual Input */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-mac-soft overflow-hidden">
        <div className="bg-muted/30 border-b border-border/40 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Manual 2θ Entry
          </p>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter 2θ values manually (comma-separated):
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. 5.24, 12.60, 18.32, 24.88, 31.05"
              className="flex-1 bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              data-ocid="xrpd.manual_input"
              onKeyDown={(e) => e.key === "Enter" && handleManualCalculate()}
            />
            <Button
              onClick={handleManualCalculate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
              data-ocid="xrpd.calculate_button"
            >
              Extract
            </Button>
          </div>
        </div>
      </div>

      {/* Results Table — only 2θ and Intensity */}
      {peaks && peaks.length > 0 && (
        <div
          className="rounded-2xl border border-indigo-500/30 bg-indigo-950/10 shadow-mac-soft overflow-hidden"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.08)" }}
          data-ocid="xrpd.results_panel"
        >
          {/* Header */}
          <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Peak Values
              </p>
              <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 rounded-full px-2 py-0.5 font-semibold">
                {peaks.length} peak{peaks.length !== 1 ? "s" : ""} detected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-indigo-500/30 hover:bg-indigo-500/10"
                onClick={handleCopy}
                data-ocid="xrpd.copy_button"
              >
                <ClipboardCopy className="h-3 w-3 mr-1" />
                {copied ? "Copied!" : "Copy All"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-indigo-500/30 hover:bg-indigo-500/10"
                onClick={handleDownloadCSV}
                data-ocid="xrpd.download_button"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>

          {/* Table — only 2θ and Intensity */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-ocid="xrpd.peaks_table">
              <thead>
                <tr className="border-b border-indigo-500/15 bg-indigo-500/5">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-muted-foreground w-10">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-muted-foreground">
                    2θ (°)
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-muted-foreground">
                    Intensity (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {peaks.map((peak, i) => {
                  const isStrongest =
                    strongestPeak && peak.index === strongestPeak.index;
                  return (
                    <tr
                      key={peak.index}
                      className={`border-b border-border/20 transition-colors ${
                        isStrongest
                          ? "bg-yellow-500/10 border-yellow-500/20"
                          : i % 2 === 0
                            ? "bg-transparent"
                            : "bg-muted/10"
                      }`}
                      data-ocid={`xrpd.peak_row_${peak.index}`}
                    >
                      <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                        {isStrongest ? (
                          <span className="w-4 h-4 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 text-[9px] font-bold">
                            ★
                          </span>
                        ) : (
                          peak.index
                        )}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono font-semibold ${
                          isStrongest ? "text-yellow-400" : "text-foreground"
                        }`}
                      >
                        {peak.twotheta.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex-1 max-w-[80px] bg-muted/30 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isStrongest ? "bg-yellow-400" : "bg-indigo-400"}`}
                              style={{ width: `${peak.relIntensity}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-mono font-semibold w-10 text-right ${
                              isStrongest
                                ? "text-yellow-400"
                                : "text-foreground"
                            }`}
                          >
                            {peak.relIntensity.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-indigo-500/15 bg-indigo-500/5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-mono text-muted-foreground">
              Intensity shown as % relative to strongest peak
            </p>
            {strongestPeak && (
              <p className="text-xs text-yellow-400 font-semibold">
                ★ Strongest peak: 2θ = {strongestPeak.twotheta.toFixed(2)}°
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
