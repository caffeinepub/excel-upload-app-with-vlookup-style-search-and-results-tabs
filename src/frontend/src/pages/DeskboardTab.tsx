import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Telescope,
  X,
} from "lucide-react";
import { useState } from "react";
import AdminBroadcastComposer from "../components/broadcast/AdminBroadcastComposer";
import BroadcastHistory from "../components/broadcast/BroadcastHistory";
import AdminStatusKPI from "../components/dashboard/AdminStatusKPI";
import FDAApprovalsKPI from "../components/dashboard/FDAApprovalsKPI";
import MoleculeSearchPanel from "../components/dashboard/MoleculeSearchPanel";
import OrangeBookKPI from "../components/dashboard/OrangeBookKPI";
import PatentUpdatesKPI from "../components/dashboard/PatentUpdatesKPI";
import ClockCalendarWidget from "../components/deskboard/ClockCalendarWidget";
import TeamMessagesWidget from "../components/deskboard/TeamMessagesWidget";
import ExploreHerePanel from "../components/search/ExploreHerePanel";
import { useIsCallerAdmin } from "../hooks/useApproval";
import {
  useDismissBroadcast,
  useGetActiveBroadcasts,
  useGetBroadcastHistory,
} from "../hooks/useBroadcasts";
import { useGetCalendarEvents } from "../hooks/useCalendarEvents";
import { useToggleTodo } from "../hooks/useProductivityMutations";
import { useGetReminders, useGetTodos } from "../hooks/useProductivityQueries";

export default function DeskboardTab({
  onNavigate,
}: { onNavigate?: (tab: string) => void } = {}) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [broadcastHistoryOpen, setBroadcastHistoryOpen] = useState(false);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isAdmin = false } = useIsCallerAdmin();

  const { data: reminders = [] } = useGetReminders();
  const { data: calendarEvents = [] } = useGetCalendarEvents();
  const { data: todos = [] } = useGetTodos();
  const { data: activeBroadcasts = [] } =
    useGetActiveBroadcasts(isAuthenticated);
  const { data: broadcastHistory = [] } = useGetBroadcastHistory();
  const dismissBroadcast = useDismissBroadcast();
  const toggleTodo = useToggleTodo();

  // Filter out admin-status internal broadcasts from visible display
  const realBroadcasts = activeBroadcasts.filter(
    (b) =>
      !b.text.startsWith("__ADMINSTATUS__") &&
      !b.text.startsWith("__ADMINSTATUS_CLEAR__") &&
      !b.text.startsWith("__STATUSCOMMENT__"),
  );

  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  // Reminders for today — also include repeat-until reminders
  const todayReminders = reminders.filter((r) => {
    if (r.date === today) return true;
    if (r.repeatUntilDate && r.date <= today) {
      const endDate = new Date(Number(r.repeatUntilDate))
        .toISOString()
        .split("T")[0];
      return endDate >= today;
    }
    return false;
  });

  const upcomingEvents = calendarEvents
    .filter((e) => Number(e.dateTime) > now)
    .sort((a, b) => Number(a.dateTime) - Number(b.dateTime))
    .slice(0, 5);

  const incompleteTodos = todos.filter((t) => !t.completed).slice(0, 5);

  const formatEventDate = (dateTimeBigint: bigint) => {
    const ms = Number(dateTimeBigint);
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const latestBroadcast =
    realBroadcasts.length > 0
      ? [...realBroadcasts].sort(
          (a, b) => Number(b.createdAt) - Number(a.createdAt),
        )[0]
      : null;

  return (
    <div className="min-h-full bg-background p-4 md:p-6 space-y-4">
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

      {/* Active Broadcasts — shown to all users (admin-status messages excluded) */}
      {isAuthenticated && realBroadcasts.length > 0 && (
        <div className="space-y-2" data-ocid="dashboard.broadcasts.panel">
          {realBroadcasts.map((broadcast) => (
            <div
              key={broadcast.id.toString()}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
              data-ocid="dashboard.broadcast.card"
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary mb-0.5">
                  Admin Announcement
                </p>
                <p className="text-sm text-foreground">{broadcast.text}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => dismissBroadcast.mutate(broadcast.id)}
                data-ocid="dashboard.broadcast.close_button"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Reminder Notification Bar */}
      {isAuthenticated && todayReminders.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 overflow-hidden dark:bg-amber-900/20 dark:border-amber-700/30 dark:text-amber-300">
          <Bell className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
            <span className="text-xs font-semibold mr-2">
              Today's Reminders:
            </span>
            <span className="text-xs">
              {todayReminders.map((r) => r.message).join(" • ")}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {todayReminders.length}
          </Badge>
        </div>
      )}

      {/* Upcoming Events Bar */}
      {isAuthenticated && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 overflow-hidden dark:bg-blue-900/20 dark:border-blue-700/30 dark:text-blue-300">
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

      {/* Broadcast History — visible to all authenticated users */}
      {isAuthenticated && (
        <div className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden">
          <button
            type="button"
            onClick={() => setBroadcastHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/10 transition-colors"
            data-ocid="dashboard.broadcast-history.toggle"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Broadcast History
              </span>
              {realBroadcasts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {realBroadcasts.length}
                </Badge>
              )}
            </div>
            {broadcastHistoryOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {broadcastHistoryOpen && (
            <div className="px-4 pb-4 border-t border-border/40 pt-2">
              <BroadcastHistory broadcasts={broadcastHistory} />
            </div>
          )}
        </div>
      )}

      {/* FDA KPI Widgets */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FDAApprovalsKPI />
          <OrangeBookKPI />
        </div>
      )}

      {/* Admin Status KPI — immediately below FDA KPIs */}
      <AdminStatusKPI />

      {/* Patent Tracker Updates KPI — below Admin Status */}
      {isAuthenticated && <PatentUpdatesKPI />}

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

      {/* Team Messages Widget */}
      {isAuthenticated && <TeamMessagesWidget onNavigate={onNavigate} />}

      {/* Upcoming Calendar Events Widget */}
      {isAuthenticated && (
        <div
          className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden"
          data-ocid="dashboard.upcoming-events.panel"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <CalendarClock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">
              Upcoming Events
            </span>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-2 py-0.5 font-semibold">
              {upcomingEvents.length}
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {upcomingEvents.length === 0 && (
              <div
                className="flex items-center gap-2 px-4 py-4"
                data-ocid="dashboard.upcoming-events.empty_state"
              >
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No upcoming events scheduled
                </p>
              </div>
            )}
            {upcomingEvents.map((event) => {
              const ms = Number(event.dateTime);
              const eventDate = new Date(ms);
              const isToday =
                eventDate.toDateString() === new Date().toDateString();
              const isTomorrow =
                eventDate.toDateString() ===
                new Date(Date.now() + 86400000).toDateString();
              const label = isToday
                ? "Today"
                : isTomorrow
                  ? "Tomorrow"
                  : formatEventDate(event.dateTime);
              return (
                <div
                  key={event.id.toString()}
                  className="flex items-center gap-3 px-4 py-3"
                  data-ocid="dashboard.upcoming-event.row"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isToday ? "bg-red-500" : isTomorrow ? "bg-amber-400" : "bg-blue-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full ${isToday ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : isTomorrow ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reminders & Todos Row */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Reminders Widget */}
          <div
            className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden"
            data-ocid="dashboard.reminders.panel"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                Today's Reminders
              </span>
              {todayReminders.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {todayReminders.length}
                </Badge>
              )}
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {todayReminders.length === 0 ? (
                <p
                  className="text-xs text-muted-foreground text-center py-4"
                  data-ocid="dashboard.reminders.empty_state"
                >
                  No reminders for today
                </p>
              ) : (
                todayReminders.map((r, idx) => (
                  <div
                    key={r.id.toString()}
                    className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-700/20"
                    data-ocid={`dashboard.reminder.item.${idx + 1}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {r.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.time}
                        {r.repeatUntilDate && " (repeating)"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* To-Do Widget */}
          <div
            className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden"
            data-ocid="dashboard.todos.panel"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <div className="w-4 h-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 16 16"
                  className="w-4 h-4 text-emerald-500"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm3 4.5L4 7.5l2 2 4-4-1-1-3 3-1-1z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">
                To-Do
              </span>
              {incompleteTodos.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {incompleteTodos.length}
                </Badge>
              )}
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {incompleteTodos.length === 0 ? (
                <p
                  className="text-xs text-muted-foreground text-center py-4"
                  data-ocid="dashboard.todos.empty_state"
                >
                  {todos.length === 0
                    ? "No todos yet"
                    : "All tasks completed! 🎉"}
                </p>
              ) : (
                incompleteTodos.map((todo, idx) => (
                  <div
                    key={todo.id.toString()}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 transition-colors"
                    data-ocid={`dashboard.todo.item.${idx + 1}`}
                  >
                    <Checkbox
                      id={`dashboard-todo-${todo.id.toString()}`}
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo.mutate(todo.id)}
                      className="flex-shrink-0"
                      data-ocid={`dashboard.todo.checkbox.${idx + 1}`}
                    />
                    <label
                      htmlFor={`dashboard-todo-${todo.id.toString()}`}
                      className={`text-xs cursor-pointer truncate ${
                        todo.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {todo.text}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explore Universe Section */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setExploreOpen((o) => !o)}
          className="w-full flex items-center justify-between p-5 hover:bg-accent/10 transition-colors"
          data-ocid="dashboard.explore.toggle"
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
                Search and discover topics
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

      {/* Molecule Explorer Section */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setResearchOpen((o) => !o)}
          className="w-full flex items-center justify-between p-5 hover:bg-accent/10 transition-colors"
          data-ocid="dashboard.research.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">
                Molecule Explorer
              </div>
              <div className="text-xs text-muted-foreground">
                Search drug/compound structures
              </div>
            </div>
          </div>
          {researchOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {researchOpen && (
          <div className="px-5 pb-5 border-t border-border/40 pt-4">
            <MoleculeSearchPanel />
          </div>
        )}
      </div>

      {/* Latest Announcement pinned at bottom (admin-status messages excluded) */}
      {isAuthenticated && latestBroadcast && (
        <div className="border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
            Latest Announcement
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <Megaphone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{latestBroadcast.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
