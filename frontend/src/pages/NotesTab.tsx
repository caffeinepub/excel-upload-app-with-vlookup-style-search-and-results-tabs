import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetNotes } from '../hooks/useProductivityQueries';
import { useCreateNote, useDeleteNote } from '../hooks/useProductivityMutations';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { StickyNote, Trash2, AlertCircle, Plus } from 'lucide-react';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';

export function NotesTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: notes = [], isLoading } = useGetNotes();
  const createMutation = useCreateNote();
  const deleteMutation = useDeleteNote();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setError(null);

    try {
      await createMutation.mutateAsync({ title, content });
      setDialogOpen(false);
      setTitle('');
      setContent('');
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error('Failed to create note:', err);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm('Delete this note?')) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error('Failed to delete note:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and manage your notes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Sort notes by lastUpdated (most recent first)
  const sortedNotes = [...notes].sort((a, b) => Number(b.lastUpdated - a.lastUpdated));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <StickyNote className="w-8 h-8" />
            Notes
          </h1>
          <p className="text-muted-foreground mt-1">Manage your notes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Create a new note</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting notes"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note here..."
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !title.trim()}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && !dialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading notes...</p>
          </CardContent>
        </Card>
      ) : sortedNotes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No notes yet. Create your first note above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedNotes.map((note) => (
            <Card key={Number(note.id)} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg line-clamp-1">{note.title || 'Untitled'}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(note.id)}
                  disabled={deleteMutation.isPending}
                  className="h-8 w-8 -mt-1 -mr-2"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {note.content || 'No content'}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(Number(note.lastUpdated) / 1_000_000).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
