import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MessageSquare,
  Telescope,
  X,
} from "lucide-react";
import { useState } from "react";
import AdminBroadcastComposer from "../components/broadcast/AdminBroadcastComposer";
import ClockCalendarWidget from "../components/deskboard/ClockCalendarWidget";
import ExploreHerePanel from "../components/search/ExploreHerePanel";
import { useIsCallerAdmin } from "../hooks/useApproval";
import {
  useDismissBroadcast,
  useGetActiveBroadcasts,
} from "../hooks/useBroadcasts";
import { useGetCalendarEvents } from "../hooks/useCalendarEvents";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useToggleTodo } from "../hooks/useProductivityMutations";
import { useGetReminders, useGetTodos } from "../hooks/useProductivityQueries";

export default function DeskboardTab() {
  const [exploreOpen, setExploreOpen] = useState(false);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isAdmin = false } = useIsCallerAdmin();

  const { data: reminders = [] } = useGetReminders();
  const { data: calendarEvents = [] } = useGetCalendarEvents();
  const { data: todos = [] } = useGetTodos();
  const { data: activeBroadcasts = [] } =
    useGetActiveBroadcasts(isAuthenticated);
  const dismissBroadcast = useDismissBroadcast();
  const toggleTodo = useToggleTodo();

  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  // Reminders for today — also include repeat-until reminders
  const todayReminders = reminders.filter((r) => {
    if (r.date === today) return true;
    // If reminder has repeatUntilDate, check if today is within range
    if (r.repeatUntilDate && r.date <= today) {
      const endDate = new Date(Number(r.repeatUntilDate))
        .toISOString()
        .split("T")[0];
      return endDate >= today;
    }
    return false;
  });

  const upcomingEvents = calendarEvents
    .filter((e) => Number(e.dateTime) / 1_000_000 > now)
    .sort((a, b) => Number(a.dateTime) - Number(b.dateTime))
    .slice(0, 3);

  const incompleteTodos = todos.filter((t) => !t.completed).slice(0, 5);

  const formatEventDate = (dateTimeBigint: bigint) => {
    const ms = Number(dateTimeBigint) / 1_000_000;
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

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

      {/* Active Broadcasts — shown to all users */}
      {isAuthenticated && activeBroadcasts.length > 0 && (
        <div className="space-y-2" data-ocid="dashboard.broadcasts.panel">
          {activeBroadcasts.map((broadcast) => (
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
      {isAuthenticated && upcomingEvents.length > 0 && (
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
    </div>
  );
}
