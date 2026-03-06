import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Telescope,
} from "lucide-react";
import { useState } from "react";
import AdminBroadcastComposer from "../components/broadcast/AdminBroadcastComposer";
import ClockCalendarWidget from "../components/deskboard/ClockCalendarWidget";
import ExploreHerePanel from "../components/search/ExploreHerePanel";
import { useIsCallerAdmin } from "../hooks/useApproval";
import { useGetCalendarEvents } from "../hooks/useCalendarEvents";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetReminders } from "../hooks/useProductivityQueries";

export default function DeskboardTab() {
  const [exploreOpen, setExploreOpen] = useState(false);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isAdmin = false } = useIsCallerAdmin();

  const { data: reminders = [] } = useGetReminders();
  const { data: calendarEvents = [] } = useGetCalendarEvents();

  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  const todayReminders = reminders.filter((r) => r.date === today);

  const upcomingEvents = calendarEvents
    .filter((e) => Number(e.dateTime) / 1_000_000 > now)
    .sort((a, b) => Number(a.dateTime) - Number(b.dateTime))
    .slice(0, 3);

  const formatEventDate = (dateTimeBigint: bigint) => {
    const ms = Number(dateTimeBigint) / 1_000_000;
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

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

      {/* Reminder Notification Bar */}
      {isAuthenticated && todayReminders.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 overflow-hidden">
          <Bell className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
            <span className="text-xs font-semibold mr-2">
              Today's Reminders:
            </span>
            <span className="text-xs">
              {todayReminders.map((r) => r.message).join(" • ")}
            </span>
          </div>
        </div>
      )}

      {/* Upcoming Events Bar */}
      {isAuthenticated && upcomingEvents.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 overflow-hidden">
          <CalendarDays className="w-4 h-4 flex-shrink-0 text-blue-500" />
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
            <span className="text-xs font-semibold mr-2">Upcoming:</span>
            <span className="text-xs">
              {upcomingEvents
                .map((e) => `${e.title} (${formatEventDate(e.dateTime)})`)
                .join(" • ")}
            </span>
          </div>
        </div>
      )}

      {/* Admin Broadcast Composer */}
      {isAuthenticated && isAdmin && <AdminBroadcastComposer />}

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
