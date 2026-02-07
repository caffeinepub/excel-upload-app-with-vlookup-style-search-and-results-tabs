import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetCalendarEvents, useCreateCalendarEvent, useDeleteCalendarEvent } from '../hooks/useCalendarEvents';
import { useAttendanceCalendarOverlay } from '../hooks/useAttendanceCalendarOverlay';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsCallerApproved, useIsCallerAdmin } from '../hooks/useApproval';
import { Calendar as CalendarIcon, Trash2, AlertCircle, Plus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ApprovalGate } from '../components/auth/ApprovalGate';

export function CalendarTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: userEvents = [], isLoading: userEventsLoading } = useGetCalendarEvents();
  const { data: attendanceEvents = [], isLoading: attendanceEventsLoading } = useAttendanceCalendarOverlay();
  const createMutation = useCreateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');

  // Combine user events and attendance events
  const allEvents = [...userEvents, ...attendanceEvents].sort((a, b) => Number(a.startTime - b.startTime));
  const isLoading = userEventsLoading || attendanceEventsLoading;

  const handleCreate = async () => {
    if (!title.trim() || !startTime) return;

    try {
      const timeMs = new Date(startTime).getTime();
      await createMutation.mutateAsync({
        title,
        description,
        startTime: BigInt(timeMs),
      });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setStartTime('');
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and manage your calendar events.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ApprovalGate>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-8 h-8" />
              Calendar Events
            </h1>
            <p className="text-muted-foreground mt-1">Manage your calendar events and view attendance</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Calendar Event</DialogTitle>
                <DialogDescription>Create a new calendar event</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Project kickoff"
                  />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Initial planning session"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="event-start">Start Date & Time</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !title.trim() || !startTime}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>

              {createMutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : 'Failed to create event'}
                  </AlertDescription>
                </Alert>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading events...</p>
            </CardContent>
          </Card>
        ) : allEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No events yet. Create your first event above or check in for attendance.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event) => {
              const eventDate = new Date(Number(event.startTime));
              const isAttendanceEvent = event.source === 'attendance';

              return (
                <Card key={Number(event.id)} className={isAttendanceEvent ? 'border-l-4 border-l-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          {isAttendanceEvent && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Attendance
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {eventDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {' at '}
                          {eventDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </CardDescription>
                      </div>
                      {event.isDeletable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {deleteMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Failed to delete event'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ApprovalGate>
  );
}
