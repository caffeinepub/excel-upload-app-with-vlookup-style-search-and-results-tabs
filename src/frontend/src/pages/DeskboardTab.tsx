import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Telescope,
} from "lucide-react";
import { useState } from "react";
import ClockCalendarWidget from "../components/deskboard/ClockCalendarWidget";
import ExploreHerePanel from "../components/search/ExploreHerePanel";

export default function DeskboardTab() {
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <div className="min-h-full bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Your personal workspace overview
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock & Calendar */}
        <div className="lg:col-span-1">
          <ClockCalendarWidget />
        </div>

        {/* Welcome / Stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40 p-6 shadow-mac-soft">
            <h2 className="text-lg font-bold text-foreground mb-1">
              Welcome to Crystal Atlas
            </h2>
            <p className="text-sm text-muted-foreground">
              Your all-in-one workspace for productivity, team collaboration,
              and data management. Use the sidebar to navigate between features.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card border border-border/40 p-4 shadow-mac-soft">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Quick Access
              </div>
              <div className="text-sm font-semibold text-foreground">
                Team Chat, Notes, Todos
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Stay connected and organized
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border/40 p-4 shadow-mac-soft">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Data Tools
              </div>
              <div className="text-sm font-semibold text-foreground">
                VLOOKUP, Filter, Compare
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Powerful Excel operations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explore Universe Section */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setExploreOpen((o) => !o)}
          className="w-full flex items-center justify-between p-5 hover:bg-accent/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Telescope className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">
                Explore Universe
              </div>
              <div className="text-xs text-muted-foreground">
                Search and discover topics powered by DuckDuckGo
              </div>
            </div>
          </div>
          {exploreOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {exploreOpen && (
          <div className="px-5 pb-5 border-t border-border/40 pt-4">
            <ExploreHerePanel />
          </div>
        )}
      </div>
    </div>
  );
}
