import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateTodo,
  useDeleteTodo,
  useToggleTodo,
} from "../hooks/useProductivityMutations";
import { useGetTodos } from "../hooks/useProductivityQueries";
import { getUserFriendlyError } from "../utils/errors/userFriendlyError";

export function TodoTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useGetTodos();
  const createMutation = useCreateTodo();
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<bigint | null>(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const handleCreate = async () => {
    if (!text.trim()) return;
    setError(null);

    try {
      await createMutation.mutateAsync(text);
      setDialogOpen(false);
      setText("");
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Failed to create todo:", err);
    }
  };

  const handleToggle = async (id: bigint) => {
    setError(null);

    try {
      await toggleMutation.mutateAsync(id);
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Failed to toggle todo:", err);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this to-do item?")) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      const message = getUserFriendlyError(err);
      setError(message);
      console.error("Failed to delete todo:", err);
    }
  };

  const openEdit = (id: bigint, currentText: string) => {
    setEditId(id);
    setEditText(currentText);
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId || !editText.trim() || !actor || !identity) return;
    setEditError(null);
    setIsEditSaving(true);
    try {
      // The backend saveNote function is for notes; for todos we use addTodo to replace
      // Actually, the backend doesn't have an "updateTodo" — so we delete the old one and add a new one
      // But we need to preserve the completed status. Let's get the existing todo first.
      const existing = todos.find((t) => t.id === editId);
      await actor.deleteTodo(editId);
      await actor.addTodo(editText.trim());
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
      // If it was completed, we can't easily re-toggle since we don't know the new id.
      // This is acceptable UX — edited todos reset to uncompleted.
      if (existing?.completed) {
        // Try to toggle the newest todo (it will be the last one added)
        const freshTodos = await actor.getTodos();
        const newTodo = freshTodos.find(
          (t) => t.text === editText.trim() && !t.completed,
        );
        if (newTodo) {
          await actor.toggleTodo(newTodo.id);
          await queryClient.invalidateQueries({ queryKey: ["todos"] });
        }
      }
      setEditDialogOpen(false);
      setEditId(null);
      setEditText("");
    } catch (err) {
      const message = getUserFriendlyError(err);
      setEditError(message);
      console.error("Failed to edit todo:", err);
    } finally {
      setIsEditSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and manage your to-do list.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const openTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckSquare className="w-8 h-8" />
            To-Do List
          </h1>
          <p className="text-muted-foreground mt-1">Manage your tasks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-ocid="todo.add_button">
              <Plus className="w-4 h-4 mr-2" />
              Add To-Do
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add To-Do Item</DialogTitle>
              <DialogDescription>Create a new to-do item</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="text">Description</Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Complete project report"
                  rows={3}
                  data-ocid="todo.input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="todo.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !text.trim()}
                data-ocid="todo.submit_button"
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
            <DialogTitle>Edit To-Do Item</DialogTitle>
            <DialogDescription>Update your to-do item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="edit-text">Description</Label>
              <Textarea
                id="edit-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                data-ocid="todo.edit_input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleEditSave();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-ocid="todo.edit_cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isEditSaving || !editText.trim()}
              data-ocid="todo.edit_save_button"
            >
              {isEditSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && !dialogOpen && (
        <Alert variant="destructive" data-ocid="todo.error_state">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8" data-ocid="todo.loading_state">
            <p className="text-center text-muted-foreground">
              Loading to-dos...
            </p>
          </CardContent>
        </Card>
      ) : todos.length === 0 ? (
        <Card>
          <CardContent className="py-8" data-ocid="todo.empty_state">
            <p className="text-center text-muted-foreground">
              No to-dos yet. Create your first to-do above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open To-Dos */}
          {openTodos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Open ({openTodos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2" data-ocid="todo.list">
                {openTodos.map((todo, idx) => (
                  <div
                    key={Number(todo.id)}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                    data-ocid={`todo.item.${idx + 1}`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggle(todo.id)}
                      disabled={toggleMutation.isPending}
                      data-ocid={`todo.checkbox.${idx + 1}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{todo.text}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(todo.id, todo.text)}
                        title="Edit"
                        data-ocid={`todo.edit_button.${idx + 1}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(todo.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                        data-ocid={`todo.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed To-Dos */}
          {completedTodos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Completed ({completedTodos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {completedTodos.map((todo, idx) => (
                  <div
                    key={Number(todo.id)}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors opacity-60 group"
                    data-ocid={`todo.completed.item.${idx + 1}`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggle(todo.id)}
                      disabled={toggleMutation.isPending}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-through">{todo.text}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(todo.id, todo.text)}
                        title="Edit"
                        data-ocid={`todo.completed.edit_button.${idx + 1}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(todo.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                        data-ocid={`todo.completed.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
