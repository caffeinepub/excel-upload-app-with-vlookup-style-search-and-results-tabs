import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDays,
  Clock,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CalendarEvent } from "../backend";
import { ApprovalGate } from "../components/auth/ApprovalGate";
import { useIsCallerAdmin } from "../hooks/useApproval";
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useGetCalendarEvents,
} from "../hooks/useCalendarEvents";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function formatEventTime(dateTime: bigint): string {
  const ms = Number(dateTime);
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function dateToKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventDateKey(dateTime: bigint): string {
  const d = new Date(Number(dateTime));
  return dateToKey(d);
}

export default function CalendarTab() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: events = [], isLoading } = useGetCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [timeStr, setTimeStr] = useState("09:00");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");

  // Edit form state
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTimeStr, setEditTimeStr] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState("public");

  const currentPrincipal = identity?.getPrincipal().toString();

  const selectedKey = selectedDate ? dateToKey(selectedDate) : null;

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedKey) return [];
    return events
      .filter((ev) => eventDateKey(ev.dateTime) === selectedKey)
      .sort((a, b) => Number(a.dateTime - b.dateTime));
  }, [events, selectedKey]);

  // Dates that have events (for calendar markers)
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      set.add(eventDateKey(ev.dateTime));
    }
    return set;
  }, [events]);

  const handleCreate = async () => {
    if (!title.trim() || !selectedDate) return;
    const [hh, mm] = timeStr.split(":").map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(hh ?? 9, mm ?? 0, 0, 0);
    await createEvent.mutateAsync({
      title: title.trim(),
      dateTime: BigInt(dt.getTime()),
      description: description.trim(),
      isAdminOnly: visibility === "admin",
    });
    setTitle("");
    setTimeStr("09:00");
    setDescription("");
    setVisibility("public");
    setShowCreate(false);
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this event?")) return;
    await deleteEvent.mutateAsync(id);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    const d = new Date(Number(ev.dateTime));
    setEditTimeStr(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setEditDescription(ev.description);
    setEditVisibility(ev.isAdminOnly ? "admin" : "public");
  };

  const handleEditSave = async () => {
    if (!editingEvent || !editTitle.trim() || !selectedDate) return;
    const [hh, mm] = editTimeStr.split(":").map(Number);
    const dt = new Date(Number(editingEvent.dateTime));
    dt.setHours(hh ?? 9, mm ?? 0, 0, 0);
    // Delete old + recreate (no updateCalendarEvent backend)
    await deleteEvent.mutateAsync(editingEvent.id);
    await createEvent.mutateAsync({
      title: editTitle.trim(),
      dateTime: BigInt(dt.getTime()),
      description: editDescription.trim(),
      isAdminOnly: editVisibility === "admin",
    });
    setEditingEvent(null);
  };

  const canManage = (ev: CalendarEvent) => {
    return isAdmin || ev.createdBy.toString() === currentPrincipal;
  };

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "No date selected";

  return (
    <ApprovalGate>
      <div className="space-y-4 max-w-3xl mx-auto">
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Calendar picker */}
          <div className="space-y-3">
            <Card className="p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  hasEvent: (date) => eventDates.has(dateToKey(date)),
                }}
                modifiersClassNames={{
                  hasEvent:
                    "bg-primary/10 font-semibold text-primary rounded-full",
                }}
              />
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Dates with events are highlighted in blue
            </p>
          </div>

          {/* Right: Events for selected date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{selectedDateLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedDateEvents.length} event
                  {selectedDateEvents.length !== 1 ? "s" : ""}
                </p>
              </div>
              {selectedDate && (
                <Button
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="gap-1"
                  data-ocid="calendar.events.open_modal_button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Event
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading events...
              </div>
            ) : selectedDateEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-10 gap-3">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="calendar.events.empty_state"
                  >
                    No events on this day
                  </p>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreate(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Event
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map((ev) => (
                  <Card
                    key={ev.id.toString()}
                    className={`p-3 ${
                      ev.isAdminOnly
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                    data-ocid="calendar.events.card"
                  >
                    <div className="flex items-start justify-between gap-2">
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
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatEventTime(ev.dateTime)}
                        </p>
                        {ev.description && (
                          <p className="text-sm text-foreground/80 mt-1">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      {canManage(ev) && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(ev)}
                            data-ocid="calendar.events.edit_button"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(ev.id)}
                            disabled={deleteEvent.isPending}
                            data-ocid="calendar.events.delete_button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* All upcoming events summary */}
            {events.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  All Events ({events.length})
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...events]
                    .sort((a, b) => Number(a.dateTime - b.dateTime))
                    .map((ev) => (
                      <button
                        key={ev.id.toString()}
                        type="button"
                        className="w-full text-left px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
                        onClick={() => {
                          const d = new Date(Number(ev.dateTime));
                          setSelectedDate(d);
                        }}
                      >
                        <span className="text-muted-foreground w-16 shrink-0">
                          {new Date(Number(ev.dateTime)).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <span className="truncate font-medium">{ev.title}</span>
                        {ev.isAdminOnly && (
                          <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Event Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent
            className="sm:max-w-md"
            data-ocid="calendar.events.dialog"
          >
            <DialogHeader>
              <DialogTitle>Create Event — {selectedDateLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="ev-title">Title *</Label>
                <Input
                  id="ev-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  data-ocid="calendar.events.title.input"
                />
              </div>
              <div>
                <Label htmlFor="ev-time">Time</Label>
                <Input
                  id="ev-time"
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  data-ocid="calendar.events.time.input"
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
                  data-ocid="calendar.events.description.textarea"
                />
              </div>
              {isAdmin && (
                <div>
                  <Label htmlFor="ev-visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger id="ev-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="admin">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                data-ocid="calendar.events.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!title.trim() || createEvent.isPending}
                data-ocid="calendar.events.submit_button"
              >
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog
          open={editingEvent !== null}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            data-ocid="calendar.events.edit.dialog"
          >
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  data-ocid="calendar.events.edit.title.input"
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editTimeStr}
                  onChange={(e) => setEditTimeStr(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              {isAdmin && (
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={editVisibility}
                    onValueChange={setEditVisibility}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="admin">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingEvent(null)}
                data-ocid="calendar.events.edit.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={
                  !editTitle.trim() ||
                  deleteEvent.isPending ||
                  createEvent.isPending
                }
                data-ocid="calendar.events.edit.save_button"
              >
                {deleteEvent.isPending || createEvent.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ApprovalGate>
  );
}
