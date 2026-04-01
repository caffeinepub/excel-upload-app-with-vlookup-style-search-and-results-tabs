import { Button } from "@/components/ui/button";
import { Calculator, RefreshCw } from "lucide-react";
import { useState } from "react";

interface TGAResult {
  molesWater: number;
  molesCompound: number;
  nRaw: number;
  nRounded: number;
  hydrateName: string;
  tempNote: string;
}

const HYDRATE_NAMES: Record<number, string> = {
  0.5: "Hemihydrate",
  1: "Monohydrate",
  1.5: "Sesquihydrate",
  2: "Dihydrate",
  3: "Trihydrate",
  4: "Tetrahydrate",
  5: "Pentahydrate",
  6: "Hexahydrate",
  7: "Heptahydrate",
  8: "Octahydrate",
  9: "Nonahydrate",
  10: "Decahydrate",
};

const SNAP_POINTS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function snapToNearest(n: number): number {
  return SNAP_POINTS.reduce((prev, curr) =>
    Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev,
  );
}

function getTempNote(T: number): string {
  if (T < 150) return "Surface water or weakly bound moisture";
  if (T <= 300) return "Bound crystalline water (hydrate water)";
  return "Possible decomposition or structural water loss";
}

function calculateTGA(W: number, T: number, MW: number): TGAResult {
  const molesWater = W / 18;
  const molesCompound = (100 - W) / MW;
  const nRaw = (W * MW) / (18 * (100 - W));
  const nRounded = snapToNearest(nRaw);
  const hydrateName = HYDRATE_NAMES[nRounded] ?? `${nRounded}-hydrate`;
  const tempNote = getTempNote(T);
  return { molesWater, molesCompound, nRaw, nRounded, hydrateName, tempNote };
}

export default function TGACalculatorTab() {
  const [W, setW] = useState("");
  const [T, setT] = useState("");
  const [MW, setMW] = useState("");
  const [result, setResult] = useState<TGAResult | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    const wVal = Number.parseFloat(W);
    const tVal = Number.parseFloat(T);
    const mwVal = Number.parseFloat(MW);

    if (Number.isNaN(wVal) || wVal <= 0 || wVal >= 100) {
      setError("Weight loss W must be between 0 and 100 (exclusive).");
      return;
    }
    if (Number.isNaN(tVal)) {
      setError("Temperature T is required.");
      return;
    }
    if (Number.isNaN(mwVal) || mwVal <= 0) {
      setError("Molecular weight MW must be a positive number.");
      return;
    }

    setResult(calculateTGA(wVal, tVal, mwVal));
  };

  const handleClear = () => {
    setW("");
    setT("");
    setMW("");
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">TGA Calculator</h1>
          <p className="text-xs text-muted-foreground">
            Thermogravimetric Analysis — Hydrate Number Calculator
          </p>
        </div>
      </div>

      {/* Input Panel */}
      <div
        className="rounded-2xl border border-border/40 bg-card shadow-mac-soft overflow-hidden"
        data-ocid="tga.card"
      >
        <div className="bg-muted/30 border-b border-border/40 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Input Parameters
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* W */}
          <div>
            <label
              htmlFor="tga-w"
              className="block text-xs font-semibold text-muted-foreground mb-1.5"
            >
              Weight Loss W (%)
            </label>
            <input
              id="tga-w"
              type="number"
              value={W}
              onChange={(e) => setW(e.target.value)}
              placeholder="e.g. 12.5"
              className="w-full bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400/40"
              data-ocid="tga.input"
            />
          </div>
          {/* T */}
          <div>
            <label
              htmlFor="tga-t"
              className="block text-xs font-semibold text-muted-foreground mb-1.5"
            >
              Temperature T (°C)
            </label>
            <input
              id="tga-t"
              type="number"
              value={T}
              onChange={(e) => setT(e.target.value)}
              placeholder="e.g. 120"
              className="w-full bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400/40"
              data-ocid="tga.input"
            />
          </div>
          {/* MW */}
          <div>
            <label
              htmlFor="tga-mw"
              className="block text-xs font-semibold text-muted-foreground mb-1.5"
            >
              Molecular Weight MW (g/mol)
            </label>
            <input
              id="tga-mw"
              type="number"
              value={MW}
              onChange={(e) => setMW(e.target.value)}
              placeholder="e.g. 342.3"
              className="w-full bg-muted/40 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400/40"
              data-ocid="tga.input"
            />
          </div>
        </div>

        {error && (
          <div
            className="mx-5 mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive"
            data-ocid="tga.error_state"
          >
            {error}
          </div>
        )}

        <div className="px-5 pb-5 flex gap-3">
          <Button
            onClick={handleCalculate}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
            data-ocid="tga.submit_button"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            data-ocid="tga.secondary_button"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className="rounded-2xl border border-green-500/30 bg-green-950/10 shadow-mac-soft overflow-hidden"
          style={{
            boxShadow: "0 0 20px rgba(34,197,94,0.08)",
          }}
          data-ocid="tga.success_state"
        >
          <div className="bg-green-500/10 border-b border-green-500/20 px-5 py-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-wider text-green-400">
              Calculation Results
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Primary result */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 rounded-xl bg-green-500/5 border border-green-500/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Number of Water Molecules (n)
                </p>
                <p className="text-4xl font-mono font-bold text-green-400">
                  {result.nRounded}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculated: {result.nRaw.toFixed(4)}
                </p>
              </div>
              <div className="flex-1 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Hydrate Type
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {result.hydrateName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.nRounded} H₂O per formula unit
                </p>
              </div>
            </div>

            {/* Intermediate calculations */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Moles of Water</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                  {result.molesWater.toFixed(4)} mol
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Moles of Compound
                </p>
                <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                  {result.molesCompound.toFixed(4)} mol
                </p>
              </div>
            </div>

            {/* Temperature note */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                Temperature Note
              </p>
              <p className="text-sm text-foreground">{result.tempNote}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formula Reference */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-mac-soft overflow-hidden">
        <div className="bg-muted/30 border-b border-border/40 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Formula Reference
          </p>
        </div>
        <div className="p-5 space-y-2 font-mono text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-semibold">Assumption:</span>{" "}
            100 g sample
          </p>
          <p>
            <span className="text-green-400">moles_water</span> = W / 18
          </p>
          <p>
            <span className="text-green-400">moles_compound</span> = (100 − W) /
            MW
          </p>
          <p>
            <span className="text-green-400">n</span> = (W × MW) / [18 × (100 −
            W)]
          </p>
          <div className="border-t border-border/40 pt-2 mt-2 space-y-1 not-font-mono">
            <p className="font-sans">
              <span className="text-amber-400 font-semibold">&lt;150°C:</span>{" "}
              Surface water or weakly bound moisture
            </p>
            <p className="font-sans">
              <span className="text-amber-400 font-semibold">150–300°C:</span>{" "}
              Bound crystalline water (hydrate water)
            </p>
            <p className="font-sans">
              <span className="text-amber-400 font-semibold">&gt;300°C:</span>{" "}
              Possible decomposition or structural water loss
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
