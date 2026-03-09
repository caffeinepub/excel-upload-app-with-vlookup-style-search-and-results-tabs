import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from "../hooks/useProductivityMutations";
import { useGetNotes } from "../hooks/useProductivityQueries";
import { getUserFriendlyError } from "../utils/errors/userFriendlyError";

export function NotesTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: notes = [], isLoading } = useGetNotes();
  const createMutation = useCreateNote();
  const deleteMutation = useDeleteNote();
  const updateMutation = useUpdateNote();

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<bigint | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setError(null);

    try {
      await createMutation.mutateAsync({ title, content });
      setDialogOpen(false);
      setTitle("");
      setContent("");
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Failed to create note:", err);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this note?")) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Failed to delete note:", err);
    }
  };

  const openEdit = (
    id: bigint,
    currentTitle: string,
    currentContent: string,
  ) => {
    setEditId(id);
    setEditTitle(currentTitle);
    setEditContent(currentContent);
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId || !editTitle.trim()) return;
    setEditError(null);

    try {
      await updateMutation.mutateAsync({
        id: editId,
        title: editTitle,
        content: editContent,
      });
      setEditDialogOpen(false);
      setEditId(null);
      setEditTitle("");
      setEditContent("");
    } catch (err) {
      const message = getUserFriendlyError(err);
      setEditError(message);
      console.error("Failed to edit note:", err);
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
  const sortedNotes = [...notes].sort((a, b) =>
    Number(b.lastUpdated - a.lastUpdated),
  );

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
            <Button data-ocid="notes.add_button">
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
                  data-ocid="notes.title_input"
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
                  data-ocid="notes.content_input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="notes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !title.trim()}
                data-ocid="notes.submit_button"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>Update your note</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-ocid="notes.edit_title_input"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                data-ocid="notes.edit_content_input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-ocid="notes.edit_cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending || !editTitle.trim()}
              data-ocid="notes.edit_save_button"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && !dialogOpen && (
        <Alert variant="destructive" data-ocid="notes.error_state">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8" data-ocid="notes.loading_state">
            <p className="text-center text-muted-foreground">
              Loading notes...
            </p>
          </CardContent>
        </Card>
      ) : sortedNotes.length === 0 ? (
        <Card>
          <CardContent className="py-8" data-ocid="notes.empty_state">
            <p className="text-center text-muted-foreground">
              No notes yet. Create your first note above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="notes.list"
        >
          {sortedNotes.map((note, idx) => (
            <Card
              key={Number(note.id)}
              className="flex flex-col"
              data-ocid={`notes.item.${idx + 1}`}
            >
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg line-clamp-1">
                  {note.title || "Untitled"}
                </CardTitle>
                <div className="flex items-center gap-1 -mt-1 -mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(note.id, note.title, note.content)}
                    disabled={updateMutation.isPending}
                    className="h-8 w-8"
                    title="Edit note"
                    data-ocid={`notes.edit_button.${idx + 1}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(note.id)}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8"
                    title="Delete note"
                    data-ocid={`notes.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {note.content || "No content"}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(
                    Number(note.lastUpdated) / 1_000_000,
                  ).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
