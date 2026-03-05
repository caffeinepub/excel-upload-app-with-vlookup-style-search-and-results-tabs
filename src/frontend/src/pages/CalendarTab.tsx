import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays, Lock, Plus, RefreshCw, Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { CalendarEvent } from "../backend";
import { ApprovalGate } from "../components/auth/ApprovalGate";
import { useIsCallerAdmin } from "../hooks/useApproval";
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useGetCalendarEvents,
} from "../hooks/useCalendarEvents";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function formatEventDate(dateTime: bigint): string {
  const ms = Number(dateTime);
  return new Date(ms).toLocaleString();
}

function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const ms = Number(ev.dateTime);
    const dateKey = new Date(ms).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(ev);
  }
  return groups;
}

export default function CalendarTab() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: events = [], isLoading } = useGetCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [dateTimeStr, setDateTimeStr] = useState("");
  const [description, setDescription] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);

  const currentPrincipal = identity?.getPrincipal().toString();

  const handleCreate = async () => {
    if (!title.trim() || !dateTimeStr) return;
    const ms = new Date(dateTimeStr).getTime();
    await createEvent.mutateAsync({
      title: title.trim(),
      dateTime: BigInt(ms),
      description: description.trim(),
      isAdminOnly: adminOnly,
    });
    setTitle("");
    setDateTimeStr("");
    setDescription("");
    setAdminOnly(false);
    setShowCreate(false);
  };

  const handleDelete = async (id: bigint) => {
    await deleteEvent.mutateAsync(id);
  };

  const canDelete = (ev: CalendarEvent) => {
    return isAdmin || ev.createdBy.toString() === currentPrincipal;
  };

  const sorted = [...events].sort((a, b) => Number(a.dateTime - b.dateTime));
  const grouped = groupByDate(sorted);

  return (
    <ApprovalGate>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Calendar Events</h1>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="gap-1 opacity-60"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync Calendar
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  External calendar sync coming soon
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New Event
            </Button>
          </div>
        </div>

        {/* Events */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading events...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No events yet. Create your first event!
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {dateKey}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id.toString()}
                      className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${
                        ev.isAdminOnly
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {ev.title}
                          </span>
                          {ev.isAdminOnly && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              Admin Only
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatEventDate(ev.dateTime)}
                        </p>
                        {ev.description && (
                          <p className="text-sm text-foreground/80 mt-1">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      {canDelete(ev) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(ev.id)}
                          disabled={deleteEvent.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="ev-title">Title *</Label>
                <Input
                  id="ev-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label htmlFor="ev-datetime">Date & Time *</Label>
                <Input
                  id="ev-datetime"
                  type="datetime-local"
                  value={dateTimeStr}
                  onChange={(e) => setDateTimeStr(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ev-desc">Description</Label>
                <Textarea
                  id="ev-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ev-admin"
                    checked={adminOnly}
                    onCheckedChange={(v) => setAdminOnly(!!v)}
                  />
                  <Label htmlFor="ev-admin" className="cursor-pointer">
                    Admin-only event
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !title.trim() || !dateTimeStr || createEvent.isPending
                }
              >
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ApprovalGate>
  );
}
