import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetToDoItems } from '../hooks/useProductivityQueries';
import { useCreateToDoItem, useDeleteToDoItem, useToggleToDoItem } from '../hooks/useProductivityMutations';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { CheckSquare, Trash2, AlertCircle, Plus } from 'lucide-react';

export function TodoTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: todos = [], isLoading } = useGetToDoItems();
  const createMutation = useCreateToDoItem();
  const deleteMutation = useDeleteToDoItem();
  const toggleMutation = useToggleToDoItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!description.trim()) return;

    try {
      await createMutation.mutateAsync({ description });
      setDialogOpen(false);
      setDescription('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm('Delete this to-do item?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleToggle = async (id: bigint, completed: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, completed: !completed });
    } catch (error) {
      console.error('Failed to toggle todo:', error);
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

  const openTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

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
            <Button>
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
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Complete project report"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !description.trim()}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading to-dos...</p>
          </CardContent>
        </Card>
      ) : todos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No to-dos yet. Create your first to-do above.</p>
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
              <CardContent className="space-y-2">
                {openTodos.map((todo) => (
                  <div key={Number(todo.id)} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                      disabled={toggleMutation.isPending}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{todo.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(todo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
                {completedTodos.map((todo) => (
                  <div key={Number(todo.id)} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors opacity-60">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                      disabled={toggleMutation.isPending}
                    />
                    <div className="flex-1">
                      <p className="text-sm line-through">{todo.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(todo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
