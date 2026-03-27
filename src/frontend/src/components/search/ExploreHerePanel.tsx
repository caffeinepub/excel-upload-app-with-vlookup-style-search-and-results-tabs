import {
  Atom,
  BookOpen,
  ExternalLink,
  FlaskConical,
  Globe,
  Layers,
  Loader2,
  Moon,
  Rocket,
  Search,
  Star,
  Sun,
  Telescope,
  Wind,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface DuckResult {
  title: string;
  snippet: string;
  url: string;
}

interface SearchState {
  loading: boolean;
  results: DuckResult[];
  error: string | null;
  query: string;
}

interface PubChemCompound {
  cid: number;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: number | string;
  title: string;
}

interface PubChemState {
  loading: boolean;
  results: PubChemCompound[];
  error: string | null;
  query: string;
}

const EXPLORE_CARDS = [
  {
    icon: Rocket,
    title: "Space Exploration",
    desc: "Discover the latest missions, planets, and cosmic phenomena beyond our world.",
    color: "from-indigo-500/20 to-purple-500/20",
    border: "border-indigo-500/30",
    iconColor: "text-indigo-400",
  },
  {
    icon: Atom,
    title: "Quantum Physics",
    desc: "Dive into the fundamental building blocks of the universe and quantum mechanics.",
    color: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    icon: Globe,
    title: "World Geography",
    desc: "Explore countries, cultures, and the diverse landscapes of our planet Earth.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    icon: BookOpen,
    title: "History & Culture",
    desc: "Journey through time and uncover the stories that shaped human civilization.",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: Telescope,
    title: "Astronomy",
    desc: "Gaze at stars, galaxies, nebulae, and the vast mysteries of deep space.",
    color: "from-violet-500/20 to-pink-500/20",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
  },
  {
    icon: Zap,
    title: "Technology",
    desc: "Stay ahead with breakthroughs in AI, computing, and emerging technologies.",
    color: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
  {
    icon: Moon,
    title: "Lunar Science",
    desc: "Explore the Moon's geology, missions, and its influence on Earth's tides.",
    color: "from-slate-500/20 to-gray-500/20",
    border: "border-slate-500/30",
    iconColor: "text-slate-300",
  },
  {
    icon: Sun,
    title: "Solar System",
    desc: "Tour the planets, moons, asteroids, and comets orbiting our star.",
    color: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/30",
    iconColor: "text-orange-400",
  },
  {
    icon: Wind,
    title: "Climate & Weather",
    desc: "Understand atmospheric science, climate patterns, and weather phenomena.",
    color: "from-sky-500/20 to-blue-500/20",
    border: "border-sky-500/30",
    iconColor: "text-sky-400",
  },
  {
    icon: Layers,
    title: "Earth Sciences",
    desc: "Explore geology, plate tectonics, volcanoes, and the layers of our planet.",
    color: "from-lime-500/20 to-green-500/20",
    border: "border-lime-500/30",
    iconColor: "text-lime-400",
  },
  {
    icon: Star,
    title: "Astrophysics",
    desc: "Understand black holes, neutron stars, and the physics of stellar evolution.",
    color: "from-fuchsia-500/20 to-purple-500/20",
    border: "border-fuchsia-500/30",
    iconColor: "text-fuchsia-400",
  },
  {
    icon: Rocket,
    title: "Future of Space",
    desc: "Mars colonization, space tourism, and humanity's next giant leap forward.",
    color: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
    iconColor: "text-rose-400",
  },
];

const CHEM_QUICK_CARDS = [
  {
    name: "Aspirin",
    formula: "C9H8O4",
    color: "from-rose-500/20 to-red-500/20",
    border: "border-rose-500/30",
  },
  {
    name: "Caffeine",
    formula: "C8H10N4O2",
    color: "from-amber-500/20 to-yellow-500/20",
    border: "border-amber-500/30",
  },
  {
    name: "Ethanol",
    formula: "C2H6O",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    name: "Water",
    formula: "H2O",
    color: "from-sky-500/20 to-blue-500/20",
    border: "border-sky-500/30",
  },
  {
    name: "Glucose",
    formula: "C6H12O6",
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
  },
  {
    name: "ATP",
    formula: "C10H16N5O13P3",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
  },
  {
    name: "Vitamin C",
    formula: "C6H8O6",
    color: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
  },
  {
    name: "Ibuprofen",
    formula: "C13H18O2",
    color: "from-teal-500/20 to-green-500/20",
    border: "border-teal-500/30",
  },
];

async function searchDuckDuckGo(query: string): Promise<DuckResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const res = await fetch(url);
  const data = await res.json();
  const results: DuckResult[] = [];

  if (data.Abstract) {
    results.push({
      title: data.Heading || query,
      snippet: data.Abstract,
      url: data.AbstractURL || "",
    });
  }
  if (data.Answer) {
    results.push({ title: "Quick Answer", snippet: data.Answer, url: "" });
  }
  if (data.Definition) {
    results.push({
      title: "Definition",
      snippet: data.Definition,
      url: data.DefinitionURL || "",
    });
  }
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 8)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 60),
          snippet: topic.Text,
          url: topic.FirstURL,
        });
      }
    }
  }
  return results;
}

async function searchPubChem(query: string): Promise<PubChemCompound[]> {
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/JSON`,
  );
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`PubChem error: ${res.status}`);
  }
  const data = await res.json();
  const compounds: PubChemCompound[] = [];
  for (const c of (data.PC_Compounds ?? []).slice(0, 6)) {
    const cid: number = c?.id?.id?.cid ?? 0;
    let iupacName = "";
    let formula = "";
    let weight: number | string = "";
    let title = "";
    for (const prop of c?.props ?? []) {
      const label = prop?.urn?.label ?? "";
      const name = prop?.urn?.name ?? "";
      if (label === "IUPAC Name" && name === "Preferred")
        iupacName = prop?.value?.sval ?? "";
      if (label === "IUPAC Name" && !iupacName)
        iupacName = prop?.value?.sval ?? "";
      if (label === "Molecular Formula") formula = prop?.value?.sval ?? "";
      if (label === "Molecular Weight")
        weight = prop?.value?.fval ?? prop?.value?.sval ?? "";
    }
    // Try titles
    for (const synonym of c?.synonyms?.Synonym ?? []) {
      if (!title && typeof synonym === "string" && synonym.length < 40) {
        title = synonym;
        break;
      }
    }
    if (!title) title = iupacName.slice(0, 50) || query;
    compounds.push({
      cid,
      iupacName,
      molecularFormula: formula,
      molecularWeight: weight,
      title,
    });
  }
  return compounds;
}

export default function ExploreHerePanel() {
  const [activeTab, setActiveTab] = useState<"explore" | "chemistry">(
    "explore",
  );

  const [state, setState] = useState<SearchState>({
    loading: false,
    results: [],
    error: null,
    query: "",
  });
  const [inputValue, setInputValue] = useState("");

  const [chemState, setChemState] = useState<PubChemState>({
    loading: false,
    results: [],
    error: null,
    query: "",
  });
  const [chemInput, setChemInput] = useState("");

  const handleSearch = async (q?: string) => {
    const query = q ?? inputValue;
    if (!query.trim()) return;
    setState((s) => ({ ...s, loading: true, error: null, query }));
    try {
      const results = await searchDuckDuckGo(query);
      setState((s) => ({ ...s, loading: false, results, query }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Search failed. Please try again.",
      }));
    }
  };

  const handleChemSearch = async (q?: string) => {
    const query = q ?? chemInput;
    if (!query.trim()) return;
    setChemState((s) => ({ ...s, loading: true, error: null, query }));
    try {
      const results = await searchPubChem(query);
      setChemState((s) => ({ ...s, loading: false, results, query }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Search failed.";
      setChemState((s) => ({ ...s, loading: false, error: msg }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleChemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleChemSearch();
  };

  const hasResults = state.results.length > 0;
  const hasChemResults = chemState.results.length > 0;

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-muted/40 border border-border w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("explore")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "explore"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="explore.explore_tab"
        >
          <Telescope className="w-4 h-4" />
          Explore
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chemistry")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "chemistry"
              ? "bg-emerald-600 shadow text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="explore.chemistry_tab"
        >
          <FlaskConical className="w-4 h-4" />
          Chemistry (PubChem)
        </button>
      </div>

      {/* EXPLORE TAB */}
      {activeTab === "explore" && (
        <div>
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Explore the universe... search anything"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                data-ocid="explore.search_input"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={state.loading}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-ocid="explore.search_button"
            >
              {state.loading ? "Searching..." : "Search"}
            </button>
          </div>

          {state.error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {state.error}
            </div>
          )}

          {hasResults && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Results for "{state.query}"
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.results.map((r, i) => (
                  <a
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable positional list
                    key={i}
                    href={r.url || "#"}
                    target={r.url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-mac-hover transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {r.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-3">
                          {r.snippet}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!hasResults && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Explore Topics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {EXPLORE_CARDS.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      type="button"
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable positional list
                      key={i}
                      onClick={() => {
                        setInputValue(card.title);
                        handleSearch(card.title);
                      }}
                      className={`group p-4 rounded-xl bg-gradient-to-br ${card.color} border ${card.border} hover:scale-[1.03] hover:shadow-mac-hover transition-all duration-200 text-left`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${card.iconColor}`} />
                      <div className="text-sm font-semibold text-foreground">
                        {card.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {card.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {hasResults && (
            <button
              type="button"
              onClick={() =>
                setState((s) => ({ ...s, results: [], query: "" }))
              }
              className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              ← Back to Explore Topics
            </button>
          )}
        </div>
      )}

      {/* CHEMISTRY TAB */}
      {activeTab === "chemistry" && (
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                PubChem Chemical Database
              </p>
              <p className="text-xs text-muted-foreground">
                Search compounds, molecules, and chemical data via PubChem
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                value={chemInput}
                onChange={(e) => setChemInput(e.target.value)}
                onKeyDown={handleChemKeyDown}
                placeholder="Search compound (e.g. aspirin, caffeine, glucose...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-emerald-500/30 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                data-ocid="explore.chemistry_search_input"
              />
            </div>
            <button
              type="button"
              onClick={() => handleChemSearch()}
              disabled={chemState.loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              data-ocid="explore.chemistry_search_button"
            >
              {chemState.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Search
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {chemState.error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
              {chemState.error === "" || chemState.results.length === 0
                ? `No compound found for "${chemState.query}". Try a different name.`
                : chemState.error}
            </div>
          )}

          {/* Results */}
          {hasChemResults && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-emerald-600 mb-3 uppercase tracking-wider">
                Results for "{chemState.query}"
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chemState.results.map((c) => (
                  <a
                    key={c.cid}
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200"
                    data-ocid="explore.chemistry_result.row"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-4 h-4 text-emerald-500" />
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1 line-clamp-2">
                      {c.title}
                    </p>
                    {c.iupacName && c.iupacName !== c.title && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1 italic">
                        {c.iupacName}
                      </p>
                    )}
                    <div className="space-y-1">
                      {c.molecularFormula && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold w-20 flex-shrink-0">
                            Formula
                          </span>
                          <span className="text-xs font-mono bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-700">
                            {c.molecularFormula}
                          </span>
                        </div>
                      )}
                      {c.molecularWeight && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold w-20 flex-shrink-0">
                            MW
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.molecularWeight} g/mol
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold w-20 flex-shrink-0">
                          CID
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.cid}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setChemState((s) => ({ ...s, results: [], query: "" }))
                }
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                ← Back to quick explore
              </button>
            </div>
          )}

          {/* Quick explore cards */}
          {!hasChemResults && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Quick Compound Lookup
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CHEM_QUICK_CARDS.map((card, i) => (
                  <button
                    type="button"
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable positional list
                    key={i}
                    onClick={() => {
                      setChemInput(card.name);
                      handleChemSearch(card.name);
                    }}
                    className={`group p-4 rounded-xl bg-gradient-to-br ${card.color} border ${card.border} hover:scale-[1.03] hover:shadow-mac-hover transition-all duration-200 text-left`}
                  >
                    <FlaskConical className="w-5 h-5 mb-2 text-emerald-500" />
                    <div className="text-sm font-bold text-foreground">
                      {card.name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {card.formula}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
