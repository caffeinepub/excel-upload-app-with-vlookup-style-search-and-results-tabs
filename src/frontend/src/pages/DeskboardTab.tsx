import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '../state/appState';
import { useGetReminders, useGetCalendarEvents, useGetToDoItems, useGetNotes } from '../hooks/useProductivityQueries';
import { useCreateReminder, useCreateToDoItem, useCreateNote } from '../hooks/useProductivityMutations';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Upload, Search as SearchIcon, History, FileCheck, Calendar, Bell, CheckSquare, StickyNote, AlertCircle, Wallet } from 'lucide-react';
import { ClockCalendarWidget } from '../components/deskboard/ClockCalendarWidget';
import { ExploreHerePanel } from '../components/search/ExploreHerePanel';

interface DeskboardTabProps {
  onNavigate: (tab: string) => void;
}

export function DeskboardTab({ onNavigate }: DeskboardTabProps) {
  const { workbook } = useAppState();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showExplorePanel, setShowExplorePanel] = useState(false);

  // Quick add dialogs
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  // Quick add form states
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [todoDesc, setTodoDesc] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Productivity data
  const { data: reminders = [], isLoading: remindersLoading } = useGetReminders();
  const { data: events = [], isLoading: eventsLoading } = useGetCalendarEvents();
  const { data: todos = [], isLoading: todosLoading } = useGetToDoItems();
  const { data: notes = [], isLoading: notesLoading } = useGetNotes();

  // Mutations
  const createReminderMutation = useCreateReminder();
  const createTodoMutation = useCreateToDoItem();
  const createNoteMutation = useCreateNote();

  const handleExploreSearch = () => {
    if (!searchQuery.trim()) return;
    setShowExplorePanel(true);
  };

  const handleCreateReminder = async () => {
    if (!reminderTitle.trim() || !reminderTime) return;
    
    try {
      const timeMs = new Date(reminderTime).getTime();
      await createReminderMutation.mutateAsync({
        title: reminderTitle,
        description: reminderDesc,
        time: BigInt(timeMs),
      });
      setReminderDialogOpen(false);
      setReminderTitle('');
      setReminderDesc('');
      setReminderTime('');
    } catch (error) {
      console.error('Failed to create reminder:', error);
    }
  };

  const handleCreateTodo = async () => {
    if (!todoDesc.trim()) return;
    
    try {
      await createTodoMutation.mutateAsync({ description: todoDesc });
      setTodoDialogOpen(false);
      setTodoDesc('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim()) return;
    
    try {
      await createNoteMutation.mutateAsync({
        title: noteTitle,
        content: noteContent,
      });
      setNoteDialogOpen(false);
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Get upcoming reminders (next 5)
  const upcomingReminders = reminders
    .filter(r => r.isActive)
    .sort((a, b) => Number(a.time - b.time))
    .slice(0, 5);

  // Get upcoming events (next 5)
  const upcomingEvents = events
    .sort((a, b) => Number(a.startTime - b.startTime))
    .slice(0, 5);

  // Get open todos (first 5)
  const openTodos = todos
    .filter(t => !t.completed)
    .slice(0, 5);

  return (
    <div className="deskboard-container">
      <div className="deskboard-content space-y-5">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold mb-2 text-foreground/90">Welcome to Your Deskboard</h1>
          <p className="text-muted-foreground/80">Your central hub for productivity and data management</p>
        </div>

        {/* Clock and Calendar Widget - Always Visible */}
        <ClockCalendarWidget />

        {/* Explore Here Search - Inline */}
        <Card className="mac-card">
          <CardHeader>
            <CardTitle className="text-lg">Explore Here</CardTitle>
            <CardDescription>Search the web directly from your deskboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExploreSearch()}
                className="flex-1"
              />
              <Button onClick={handleExploreSearch} disabled={!searchQuery.trim()}>
                <SearchIcon className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Inline search results panel */}
            {showExplorePanel && (
              <ExploreHerePanel
                query={searchQuery}
                isOpen={showExplorePanel}
                onClose={() => setShowExplorePanel(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="mac-card">
          <CardHeader>
            <CardTitle className="text-lg">Activity Summary</CardTitle>
            <CardDescription>Overview of your current data and tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-xl mac-stat-card">
                <div className="text-2xl font-semibold text-primary">{workbook ? '1' : '0'}</div>
                <div className="text-sm text-muted-foreground">Excel File</div>
              </div>
              <div className="text-center p-4 border rounded-xl mac-stat-card">
                <div className="text-2xl font-semibold text-primary">{reminders.length}</div>
                <div className="text-sm text-muted-foreground">Reminders</div>
              </div>
              <div className="text-center p-4 border rounded-xl mac-stat-card">
                <div className="text-2xl font-semibold text-primary">{todos.filter(t => !t.completed).length}</div>
                <div className="text-sm text-muted-foreground">Open To-Dos</div>
              </div>
              <div className="text-center p-4 border rounded-xl mac-stat-card">
                <div className="text-2xl font-semibold text-primary">{notes.length}</div>
                <div className="text-sm text-muted-foreground">Notes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop-only Regular Expense Button */}
        <div className="hidden lg:block">
          <Card className="mac-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Access key features quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => onNavigate('regular-expense')}
                className="w-full"
                variant="outline"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Regular Expense
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Productivity Previews */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Upcoming Reminders */}
          <Card className="mac-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5" />
                  Upcoming Reminders
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={!isAuthenticated} className="mac-button">Add</Button>
                  </DialogTrigger>
                  <DialogContent className="mac-dialog">
                    <DialogHeader>
                      <DialogTitle>Add Reminder</DialogTitle>
                      <DialogDescription>Create a new reminder</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reminder-title">Title</Label>
                        <Input
                          id="reminder-title"
                          value={reminderTitle}
                          onChange={(e) => setReminderTitle(e.target.value)}
                          placeholder="Reminder title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reminder-desc">Description</Label>
                        <Textarea
                          id="reminder-desc"
                          value={reminderDesc}
                          onChange={(e) => setReminderDesc(e.target.value)}
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reminder-time">Time</Label>
                        <Input
                          id="reminder-time"
                          type="datetime-local"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateReminder} disabled={createReminderMutation.isPending}>
                        {createReminderMutation.isPending ? 'Adding...' : 'Add Reminder'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => onNavigate('reminders')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please log in to view reminders</AlertDescription>
                </Alert>
              ) : remindersLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : upcomingReminders.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No upcoming reminders</div>
              ) : (
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => (
                    <div key={Number(reminder.id)} className="p-3 border rounded-lg mac-preview-item">
                      <div className="font-medium">{reminder.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(Number(reminder.time)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="mac-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('calendar')}>View All</Button>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please log in to view events</AlertDescription>
                </Alert>
              ) : eventsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No upcoming events</div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div key={Number(event.id)} className="p-3 border rounded-lg mac-preview-item">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(Number(event.startTime)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open To-Dos */}
          <Card className="mac-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckSquare className="w-5 h-5" />
                  Open To-Dos
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Dialog open={todoDialogOpen} onOpenChange={setTodoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={!isAuthenticated} className="mac-button">Add</Button>
                  </DialogTrigger>
                  <DialogContent className="mac-dialog">
                    <DialogHeader>
                      <DialogTitle>Add To-Do</DialogTitle>
                      <DialogDescription>Create a new to-do item</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="todo-desc">Description</Label>
                        <Textarea
                          id="todo-desc"
                          value={todoDesc}
                          onChange={(e) => setTodoDesc(e.target.value)}
                          placeholder="What needs to be done?"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateTodo} disabled={createTodoMutation.isPending}>
                        {createTodoMutation.isPending ? 'Adding...' : 'Add To-Do'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => onNavigate('todo')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please log in to view to-dos</AlertDescription>
                </Alert>
              ) : todosLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : openTodos.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No open to-dos</div>
              ) : (
                <div className="space-y-2">
                  {openTodos.map((todo) => (
                    <div key={Number(todo.id)} className="p-3 border rounded-lg mac-preview-item">
                      <div className="font-medium">{todo.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card className="mac-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StickyNote className="w-5 h-5" />
                  Recent Notes
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={!isAuthenticated} className="mac-button">Add</Button>
                  </DialogTrigger>
                  <DialogContent className="mac-dialog">
                    <DialogHeader>
                      <DialogTitle>Add Note</DialogTitle>
                      <DialogDescription>Create a new note</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="note-title">Title</Label>
                        <Input
                          id="note-title"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="note-content">Content</Label>
                        <Textarea
                          id="note-content"
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Note content"
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                        {createNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => onNavigate('notes')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please log in to view notes</AlertDescription>
                </Alert>
              ) : notesLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No notes yet</div>
              ) : (
                <div className="space-y-2">
                  {notes.slice(0, 5).map((note) => (
                    <div key={Number(note.id)} className="p-3 border rounded-lg mac-preview-item">
                      <div className="font-medium">{note.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{note.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
