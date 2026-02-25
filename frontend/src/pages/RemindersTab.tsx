import React, { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetReminders } from '../hooks/useProductivityQueries';
import { useCreateReminder, useDeleteReminder } from '../hooks/useProductivityMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Plus, Trash2, Loader2, RefreshCw, Repeat } from 'lucide-react';
import { useActor } from '../hooks/useActor';

export default function RemindersTab() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorLoading } = useActor();
  const isAuthenticated = !!identity;
  const isReady = !!actor && !actorLoading;

  const { data: reminders, isLoading, error, refetch } = useGetReminders();
  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();

  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeatUntilDate, setRepeatUntilDate] = useState('');
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setMessage('');
    setDate('');
    setTime('');
    setRepeatUntilDate('');
    setFormError('');
  };

  const handleAdd = async () => {
    setFormError('');
    if (!message.trim()) { setFormError('Message is required.'); return; }
    if (!date) { setFormError('Date is required.'); return; }
    if (!time) { setFormError('Time is required.'); return; }
    if (repeatUntilDate && repeatUntilDate < date) {
      setFormError('Repeat Until date must be on or after the reminder date.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        message,
        date,
        time,
        repeatUntilDate: repeatUntilDate || null,
      });
      setShowAdd(false);
      resetForm();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create reminder.');
    }
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // silent
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Bell className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Please log in to view your reminders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal reminders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={!isReady}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAdd(true)} disabled={!isReady} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load reminders. Please try again.</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && reminders && reminders.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 border-2 border-dashed border-border rounded-xl">
          <Bell className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No reminders yet. Add one to get started.</p>
        </div>
      )}

      {/* List */}
      {!isLoading && reminders && reminders.length > 0 && (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id.toString()}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{reminder.message}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground">{reminder.date}</span>
                  <span className="text-sm text-muted-foreground">at {reminder.time}</span>
                  {reminder.repeatUntilDate && (
                    <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Repeat className="w-3 h-3" />
                      Daily until{' '}
                      {new Date(Number(reminder.repeatUntilDate)).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => handleDelete(reminder.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(v) => {
          if (!v) {
            setShowAdd(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-message">Message</Label>
              <Input
                id="reminder-message"
                placeholder="Reminder message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reminder-date">Date</Label>
                <Input
                  id="reminder-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reminder-time">Time</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder-repeat" className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                Repeat Daily Until
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="reminder-repeat"
                type="date"
                value={repeatUntilDate}
                min={date || undefined}
                onChange={(e) => setRepeatUntilDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If set, this reminder will trigger every day from the start date until this end date.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={createMutation.isPending || !isReady}
              className="gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
