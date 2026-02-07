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
        time: BigInt(timeMs),
      });
      setReminderDialogOpen(false);
      setReminderTitle('');
      setReminderTime('');
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('Failed to create reminder. Please try again.');
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
            <ExploreHerePanel 
              query={searchQuery} 
              isOpen={showExplorePanel}
              onClose={() => setShowExplorePanel(false)} 
            />
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="mac-card">
          <CardHeader>
            <CardTitle className="text-lg">Activity Summary</CardTitle>
            <CardDescription>Quick overview of your data and tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => onNavigate('upload')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-accent transition-colors"
              >
                <Upload className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Upload</span>
                <span className="text-xs text-muted-foreground">
                  {workbook ? 'Active' : 'No file'}
                </span>
              </button>
              <button
                onClick={() => onNavigate('search')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-accent transition-colors"
              >
                <SearchIcon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Search</span>
                <span className="text-xs text-muted-foreground">VLOOKUP</span>
              </button>
              <button
                onClick={() => onNavigate('history')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-accent transition-colors"
              >
                <History className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">History</span>
                <span className="text-xs text-muted-foreground">View logs</span>
              </button>
              <button
                onClick={() => onNavigate('update-checking')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-accent transition-colors"
              >
                <FileCheck className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Updates</span>
                <span className="text-xs text-muted-foreground">Compare</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Productivity Previews */}
        {isAuthenticated && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Upcoming Reminders */}
            <Card className="mac-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Upcoming Reminders
                  </CardTitle>
                  <CardDescription className="text-xs">Next 5 reminders</CardDescription>
                </div>
                <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add General Reminder</DialogTitle>
                      <DialogDescription>Create a new general reminder</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quick-reminder-title">Title</Label>
                        <Input
                          id="quick-reminder-title"
                          value={reminderTitle}
                          onChange={(e) => setReminderTitle(e.target.value)}
                          placeholder="Team meeting"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quick-reminder-time">Date & Time</Label>
                        <Input
                          id="quick-reminder-time"
                          type="datetime-local"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateReminder}
                        disabled={createReminderMutation.isPending || !reminderTitle.trim() || !reminderTime}
                      >
                        {createReminderMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {remindersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : upcomingReminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming reminders</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingReminders.map((reminder) => (
                      <div key={Number(reminder.id)} className="text-sm border-l-2 border-primary pl-2">
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(reminder.time)).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Events */}
            <Card className="mac-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Calendar Events
                  </CardTitle>
                  <CardDescription className="text-xs">Next 5 events</CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onNavigate('calendar')}>
                  View
                </Button>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div key={Number(event.id)} className="text-sm border-l-2 border-primary pl-2">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(event.startTime)).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* To-Do Items */}
            <Card className="mac-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    To-Do Items
                  </CardTitle>
                  <CardDescription className="text-xs">Open tasks</CardDescription>
                </div>
                <Dialog open={todoDialogOpen} onOpenChange={setTodoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add To-Do Item</DialogTitle>
                      <DialogDescription>Create a new task</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quick-todo-desc">Description</Label>
                        <Textarea
                          id="quick-todo-desc"
                          value={todoDesc}
                          onChange={(e) => setTodoDesc(e.target.value)}
                          placeholder="Complete project report"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateTodo}
                        disabled={createTodoMutation.isPending || !todoDesc.trim()}
                      >
                        {createTodoMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {todosLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : openTodos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open tasks</p>
                ) : (
                  <div className="space-y-2">
                    {openTodos.map((todo) => (
                      <div key={Number(todo.id)} className="text-sm border-l-2 border-primary pl-2">
                        <p className="font-medium">{todo.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="mac-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notes
                  </CardTitle>
                  <CardDescription className="text-xs">Recent notes</CardDescription>
                </div>
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Note</DialogTitle>
                      <DialogDescription>Create a new note</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quick-note-title">Title</Label>
                        <Input
                          id="quick-note-title"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Meeting notes"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quick-note-content">Content</Label>
                        <Textarea
                          id="quick-note-content"
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Key discussion points..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateNote}
                        disabled={createNoteMutation.isPending || !noteTitle.trim()}
                      >
                        {createNoteMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {notesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                ) : (
                  <div className="space-y-2">
                    {notes.slice(0, 5).map((note) => (
                      <div key={Number(note.id)} className="text-sm border-l-2 border-primary pl-2">
                        <p className="font-medium">{note.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Regular Expense Quick Action - Desktop Only */}
        {isAuthenticated && (
          <div className="hidden lg:block">
            <Card className="mac-card expense-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Budget & Expenses
                </CardTitle>
                <CardDescription>Manage your budget and track expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => onNavigate('regular-expense')} className="w-full expense-button">
                  Open Budget & Expenses
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Log in to access productivity features like reminders, calendar, to-dos, and notes.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
