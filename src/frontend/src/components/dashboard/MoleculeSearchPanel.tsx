import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Loader2, Search, X } from "lucide-react";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";

const ELEMENT_COLORS: Record<string, string> = {
  C: "#888888",
  H: "#ffffff",
  O: "#ff4444",
  N: "#4444ff",
  S: "#ffff00",
  P: "#ff8800",
  F: "#44ff44",
  Cl: "#88ff00",
  Br: "#884400",
};

const ELEMENT_RADIUS: Record<string, number> = {
  C: 0.4,
  H: 0.25,
  O: 0.38,
  N: 0.37,
  S: 0.5,
  P: 0.48,
  F: 0.32,
  Cl: 0.45,
  Br: 0.52,
};

interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

interface Bond {
  aid1: number;
  aid2: number;
}

interface MoleculeData {
  atoms: Atom[];
  bonds: Bond[];
  atomMap: Map<number, number>; // aid -> index
}

function AtomSphere({ atom }: { atom: Atom }) {
  const color = ELEMENT_COLORS[atom.element] ?? "#aaaaaa";
  const radius = ELEMENT_RADIUS[atom.element] ?? 0.35;
  return (
    <mesh position={[atom.x, atom.y, atom.z]}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

function BondCylinder({ a, b }: { a: Atom; b: Atom }) {
  const start = new THREE.Vector3(a.x, a.y, a.z);
  const end = new THREE.Vector3(b.x, b.y, b.z);
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length < 0.001) return null;
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  quaternion.setFromUnitVectors(up, direction.normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quaternion}>
      <cylinderGeometry args={[0.1, 0.1, length, 8]} />
      <meshStandardMaterial color="#aaaaaa" roughness={0.5} />
    </mesh>
  );
}

function Molecule3D({ data }: { data: MoleculeData }) {
  return (
    <group>
      {data.atoms.map((atom, i) => (
        <AtomSphere key={`atom-${i}-${atom.element}`} atom={atom} />
      ))}
      {data.bonds.map((bond, i) => {
        const aIdx = data.atomMap.get(bond.aid1);
        const bIdx = data.atomMap.get(bond.aid2);
        if (aIdx === undefined || bIdx === undefined) return null;
        return (
          <BondCylinder
            key={`bond-${bond.aid1}-${bond.aid2}-${i}`}
            a={data.atoms[aIdx]}
            b={data.atoms[bIdx]}
          />
        );
      })}
    </group>
  );
}

const QUICK_COMPOUNDS = [
  "Aspirin",
  "Caffeine",
  "Ibuprofen",
  "Paracetamol",
  "Morphine",
  "Penicillin",
  "Dopamine",
  "Serotonin",
];

export default function MoleculeSearchPanel() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image2D, setImage2D] = useState<string | null>(null);
  const [molecule3D, setMolecule3D] = useState<MoleculeData | null>(null);
  const [searchedName, setSearchedName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMolecule = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setImage2D(null);
    setMolecule3D(null);
    setSearchedName(name.trim());

    try {
      const encoded = encodeURIComponent(name.trim());
      // Always fetch 2D image
      const imgUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/PNG`;
      setImage2D(imgUrl);

      // Also fetch 3D data
      const jsonUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/JSON`;
      const res = await fetch(jsonUrl);
      if (!res.ok) throw new Error("Compound not found. Try a different name.");
      const json = await res.json();
      const compound = json?.PC_Compounds?.[0];
      if (!compound) throw new Error("No compound data available.");

      // Parse atoms
      const atoms: Atom[] = [];
      const atomMap = new Map<number, number>();
      const atomIds: number[] = compound.atoms?.aid ?? [];
      const elements: number[] = compound.atoms?.element ?? [];
      const ELEMENTS = [
        "",
        "H",
        "He",
        "Li",
        "Be",
        "B",
        "C",
        "N",
        "O",
        "F",
        "Ne",
        "Na",
        "Mg",
        "Al",
        "Si",
        "P",
        "S",
        "Cl",
      ];

      // Try to get 3D conformer first, fallback to 2D
      const coords = compound.coords?.[0];
      const conformer = coords?.conformers?.[0];
      const xs: number[] = conformer?.x ?? coords?.conformers?.[0]?.x ?? [];
      const ys: number[] = conformer?.y ?? coords?.conformers?.[0]?.y ?? [];
      const zs: number[] = conformer?.z ?? new Array(xs.length).fill(0);

      for (let i = 0; i < atomIds.length; i++) {
        const el = ELEMENTS[elements[i]] ?? "C";
        atomMap.set(atomIds[i], i);
        atoms.push({
          element: el,
          x: xs[i] ?? 0,
          y: ys[i] ?? 0,
          z: zs[i] ?? 0,
        });
      }

      // Parse bonds
      const bonds: Bond[] = [];
      const aid1s: number[] = compound.bonds?.aid1 ?? [];
      const aid2s: number[] = compound.bonds?.aid2 ?? [];
      for (let i = 0; i < aid1s.length; i++) {
        bonds.push({ aid1: aid1s[i], aid2: aid2s[i] });
      }

      setMolecule3D({ atoms, bonds, atomMap });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch molecule data.",
      );
      setImage2D(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchMolecule(query);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Search compound name (e.g. Aspirin, Caffeine...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 bg-muted/40 border-border text-sm"
          data-ocid="molecule-search.search_input"
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          data-ocid="molecule-search.primary_button"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {/* Quick compounds */}
      <div className="flex flex-wrap gap-2">
        {QUICK_COMPOUNDS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setQuery(c);
              fetchMolecule(c);
            }}
            className="px-3 py-1 text-xs rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
          >
            {c}
          </button>
        ))}
      </div>

      {/* 2D/3D toggle — only when there are results */}
      {(image2D || molecule3D) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          {(["2D", "3D"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1 text-xs rounded-full font-semibold transition-colors ${
                viewMode === mode
                  ? "bg-teal-600 text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
              data-ocid={`molecule-search.${mode.toLowerCase()}_toggle`}
            >
              {mode}
            </button>
          ))}
          {searchedName && (
            <span className="ml-auto text-xs font-semibold text-teal-400">
              {searchedName}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center h-48 rounded-xl bg-muted/30 border border-border/40">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <span className="text-xs">Fetching structure data...</span>
          </div>
        </div>
      )}

      {/* 2D View */}
      {!loading && viewMode === "2D" && image2D && (
        <div className="flex flex-col items-center rounded-xl bg-white border border-border/40 p-4">
          <img
            src={image2D}
            alt={`${searchedName} 2D structure`}
            className="max-h-64 object-contain"
            onError={() => setError("Could not load 2D structure image.")}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            2D structure via PubChem
          </p>
        </div>
      )}

      {/* 3D View */}
      {!loading && viewMode === "3D" && molecule3D && (
        <div className="rounded-xl overflow-hidden border border-border/40 bg-black">
          <div className="h-64">
            <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.4} />
              <Suspense fallback={null}>
                <Molecule3D data={molecule3D} />
              </Suspense>
              <OrbitControls
                enablePan
                enableZoom
                enableRotate
                autoRotate
                autoRotateSpeed={1.5}
              />
            </Canvas>
          </div>
          <p className="text-center text-[10px] text-muted-foreground py-1.5 bg-black/80">
            Drag to rotate • Scroll to zoom • 3D via PubChem
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !image2D && !molecule3D && (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs gap-2">
          <Search className="h-8 w-8 opacity-30" />
          <span>Search a compound to view its molecular structure</span>
        </div>
      )}
    </div>
  );
}
