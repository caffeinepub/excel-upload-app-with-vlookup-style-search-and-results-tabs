import { useState } from 'react';
import { Search, Star, Globe, Zap, BookOpen, Telescope, Atom, Rocket, Moon, Sun, Wind, Layers } from 'lucide-react';

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

const EXPLORE_CARDS = [
  { icon: Rocket, title: 'Space Exploration', desc: 'Discover the latest missions, planets, and cosmic phenomena beyond our world.', color: 'from-indigo-500/20 to-purple-500/20', border: 'border-indigo-500/30', iconColor: 'text-indigo-400' },
  { icon: Atom, title: 'Quantum Physics', desc: 'Dive into the fundamental building blocks of the universe and quantum mechanics.', color: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', iconColor: 'text-cyan-400' },
  { icon: Globe, title: 'World Geography', desc: 'Explore countries, cultures, and the diverse landscapes of our planet Earth.', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
  { icon: BookOpen, title: 'History & Culture', desc: 'Journey through time and uncover the stories that shaped human civilization.', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', iconColor: 'text-amber-400' },
  { icon: Telescope, title: 'Astronomy', desc: 'Gaze at stars, galaxies, nebulae, and the vast mysteries of deep space.', color: 'from-violet-500/20 to-pink-500/20', border: 'border-violet-500/30', iconColor: 'text-violet-400' },
  { icon: Zap, title: 'Technology', desc: 'Stay ahead with breakthroughs in AI, computing, and emerging technologies.', color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', iconColor: 'text-yellow-400' },
  { icon: Moon, title: 'Lunar Science', desc: 'Explore the Moon\'s geology, missions, and its influence on Earth\'s tides.', color: 'from-slate-500/20 to-gray-500/20', border: 'border-slate-500/30', iconColor: 'text-slate-300' },
  { icon: Sun, title: 'Solar System', desc: 'Tour the planets, moons, asteroids, and comets orbiting our star.', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', iconColor: 'text-orange-400' },
  { icon: Wind, title: 'Climate & Weather', desc: 'Understand atmospheric science, climate patterns, and weather phenomena.', color: 'from-sky-500/20 to-blue-500/20', border: 'border-sky-500/30', iconColor: 'text-sky-400' },
  { icon: Layers, title: 'Earth Sciences', desc: 'Explore geology, plate tectonics, volcanoes, and the layers of our planet.', color: 'from-lime-500/20 to-green-500/20', border: 'border-lime-500/30', iconColor: 'text-lime-400' },
  { icon: Star, title: 'Astrophysics', desc: 'Understand black holes, neutron stars, and the physics of stellar evolution.', color: 'from-fuchsia-500/20 to-purple-500/20', border: 'border-fuchsia-500/30', iconColor: 'text-fuchsia-400' },
  { icon: Rocket, title: 'Future of Space', desc: 'Mars colonization, space tourism, and humanity\'s next giant leap forward.', color: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/30', iconColor: 'text-rose-400' },
];

async function searchDuckDuckGo(query: string): Promise<DuckResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const res = await fetch(url);
  const data = await res.json();
  const results: DuckResult[] = [];

  if (data.Abstract) {
    results.push({ title: data.Heading || query, snippet: data.Abstract, url: data.AbstractURL || '' });
  }
  if (data.Answer) {
    results.push({ title: 'Quick Answer', snippet: data.Answer, url: '' });
  }
  if (data.Definition) {
    results.push({ title: 'Definition', snippet: data.Definition, url: data.DefinitionURL || '' });
  }
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 8)) {
      if (topic.Text && topic.FirstURL) {
        results.push({ title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60), snippet: topic.Text, url: topic.FirstURL });
      }
    }
  }
  return results;
}

export default function ExploreHerePanel() {
  const [state, setState] = useState<SearchState>({ loading: false, results: [], error: null, query: '' });
  const [inputValue, setInputValue] = useState('');

  const handleSearch = async (q?: string) => {
    const query = q ?? inputValue;
    if (!query.trim()) return;
    setState(s => ({ ...s, loading: true, error: null, query }));
    try {
      const results = await searchDuckDuckGo(query);
      setState(s => ({ ...s, loading: false, results, query }));
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Search failed. Please try again.' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const hasResults = state.results.length > 0;

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Explore the universe... search anything"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={state.loading}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {state.loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error */}
      {state.error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{state.error}</div>
      )}

      {/* Search Results */}
      {hasResults && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Results for "{state.query}"
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.results.map((r, i) => (
              <a
                key={i}
                href={r.url || '#'}
                target={r.url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="group block p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-mac-hover transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{r.snippet}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Explore Cards */}
      {!hasResults && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Explore Topics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EXPLORE_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <button
                  key={i}
                  onClick={() => { setInputValue(card.title); handleSearch(card.title); }}
                  className={`group p-4 rounded-xl bg-gradient-to-br ${card.color} border ${card.border} hover:scale-[1.03] hover:shadow-mac-hover transition-all duration-200 text-left`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${card.iconColor}`} />
                  <div className="text-sm font-semibold text-foreground">{card.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.desc}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {hasResults && (
        <button
          onClick={() => setState(s => ({ ...s, results: [], query: '' }))}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          ← Back to Explore Topics
        </button>
      )}
    </div>
  );
}
