import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetReminders, type Reminder } from '../hooks/useProductivityQueries';
import { useCreateReminder, useDeleteReminder } from '../hooks/useProductivityMutations';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';
import { Bell, Trash2, AlertCircle, Plus, Loader2 } from 'lucide-react';

export function RemindersTab() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  const { data: reminders = [], isLoading } = useGetReminders();
  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !time) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      const timeMs = new Date(time).getTime();
      await createMutation.mutateAsync({
        title,
        time: BigInt(timeMs),
      });
      setDialogOpen(false);
      setTitle('');
      setTime('');
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      setError(friendlyError);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm('Delete this reminder?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      alert(friendlyError);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and manage your general reminders.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="w-8 h-8" />
            General Reminders
          </h1>
          <p className="text-muted-foreground mt-1">Manage your general reminders</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isActorReady}>
              {actorFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reminder
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add General Reminder</DialogTitle>
              <DialogDescription>Create a new general reminder</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Team meeting"
                />
              </div>
              <div>
                <Label htmlFor="time">Date & Time *</Label>
                <Input
                  id="time"
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending || !isActorReady || !title.trim() || !time}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {actorFetching && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading reminders...</p>
          </CardContent>
        </Card>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No reminders yet. Create your first reminder above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders
            .sort((a, b) => Number(a.time - b.time))
            .map((reminder) => (
              <Card key={Number(reminder.id)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{reminder.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(Number(reminder.time)).toLocaleString('en-US', {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(reminder.id)}
                      disabled={deleteMutation.isPending || !isActorReady}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
