import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppStateProvider, useAppState } from './state/appState';
import { ReminderEventsProvider } from './context/ReminderEventsContext';
import { AppLayout } from './components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ScrollArea, ScrollBar } from './components/ui/scroll-area';
import { DeskboardTab } from './pages/DeskboardTab';
import { UploadTab } from './pages/UploadTab';
import { SearchTab } from './pages/SearchTab';
import { ResultsTab } from './pages/ResultsTab';
import { UpdateCheckingTab } from './pages/UpdateCheckingTab';
import { HistoryTab } from './pages/HistoryTab';
import { RemindersTab } from './pages/RemindersTab';
import { CalendarTab } from './pages/CalendarTab';
import { TodoTab } from './pages/TodoTab';
import { NotesTab } from './pages/NotesTab';
import { RegularExpenseTab } from './pages/RegularExpenseTab';
import { AttendanceTab } from './pages/AttendanceTab';
import { AdminUsersTab } from './pages/AdminUsersTab';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { DesktopSidebarNav } from './components/layout/DesktopSidebarNav';
import { UserProfileSetup } from './components/auth/UserProfileSetup';
import { ApprovalGate } from './components/auth/ApprovalGate';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 1 minute
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState('deskboard');
  const { reset } = useAppState();

  const handleFullReset = () => {
    // Clear all app state
    reset();
    // Return to deskboard tab
    setActiveTab('deskboard');
  };

  return (
    <>
      <UserProfileSetup />
      <AppLayout onNavigate={setActiveTab} activeTab={activeTab}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile navigation - visible on small screens with horizontal scroll */}
          <ScrollArea className="lg:hidden mb-8 w-full whitespace-nowrap">
            <TabsList className="inline-flex w-auto gap-1 p-1">
              <TabsTrigger value="deskboard" className="text-xs sm:text-sm">Deskboard</TabsTrigger>
              <TabsTrigger value="upload" className="text-xs sm:text-sm">Upload</TabsTrigger>
              <TabsTrigger value="search" className="text-xs sm:text-sm">Search</TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm">Results</TabsTrigger>
              <TabsTrigger value="update-checking" className="text-xs sm:text-sm">Update</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
              <TabsTrigger value="regular-expense" className="text-xs sm:text-sm">Expense</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm">Attendance</TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs sm:text-sm">Reminders</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs sm:text-sm">Calendar</TabsTrigger>
              <TabsTrigger value="todo" className="text-xs sm:text-sm">To-Do</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm">Notes</TabsTrigger>
              <TabsTrigger value="admin-users" className="text-xs sm:text-sm">Users</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Desktop layout with sidebar */}
          <div className="hidden lg:flex gap-6">
            <DesktopSidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex-1 min-w-0">
              <TabsContent value="deskboard" className="mt-0">
                <DeskboardTab onNavigate={setActiveTab} />
              </TabsContent>
              <TabsContent value="upload" className="mt-0">
                <UploadTab />
              </TabsContent>
              <TabsContent value="search" className="mt-0">
                <SearchTab onSearchComplete={() => setActiveTab('results')} />
              </TabsContent>
              <TabsContent value="results" className="mt-0">
                <ResultsTab onNavigateToUpdateChecking={() => setActiveTab('update-checking')} />
              </TabsContent>
              <TabsContent value="update-checking" className="mt-0">
                <UpdateCheckingTab onComparisonComplete={() => setActiveTab('results')} />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <ApprovalGate>
                  <HistoryTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="regular-expense" className="mt-0">
                <ApprovalGate>
                  <RegularExpenseTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="attendance" className="mt-0">
                <ApprovalGate>
                  <AttendanceTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="reminders" className="mt-0">
                <ApprovalGate>
                  <RemindersTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="calendar" className="mt-0">
                <CalendarTab />
              </TabsContent>
              <TabsContent value="todo" className="mt-0">
                <ApprovalGate>
                  <TodoTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <ApprovalGate>
                  <NotesTab />
                </ApprovalGate>
              </TabsContent>
              <TabsContent value="admin-users" className="mt-0">
                <AdminUsersTab />
              </TabsContent>
            </div>
          </div>

          {/* Mobile content - visible on small screens */}
          <div className="lg:hidden">
            <TabsContent value="deskboard">
              <DeskboardTab onNavigate={setActiveTab} />
            </TabsContent>
            <TabsContent value="upload">
              <UploadTab />
            </TabsContent>
            <TabsContent value="search">
              <SearchTab onSearchComplete={() => setActiveTab('results')} />
            </TabsContent>
            <TabsContent value="results">
              <ResultsTab onNavigateToUpdateChecking={() => setActiveTab('update-checking')} />
            </TabsContent>
            <TabsContent value="update-checking">
              <UpdateCheckingTab onComparisonComplete={() => setActiveTab('results')} />
            </TabsContent>
            <TabsContent value="history">
              <ApprovalGate>
                <HistoryTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="regular-expense">
              <ApprovalGate>
                <RegularExpenseTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="attendance">
              <ApprovalGate>
                <AttendanceTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="reminders">
              <ApprovalGate>
                <RemindersTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarTab />
            </TabsContent>
            <TabsContent value="todo">
              <ApprovalGate>
                <TodoTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="notes">
              <ApprovalGate>
                <NotesTab />
              </ApprovalGate>
            </TabsContent>
            <TabsContent value="admin-users">
              <AdminUsersTab />
            </TabsContent>
          </div>
        </Tabs>
      </AppLayout>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        {({ reset }) => (
          <AppErrorBoundary onReset={reset}>
            <ReminderEventsProvider>
              <AppContent />
            </ReminderEventsProvider>
          </AppErrorBoundary>
        )}
      </AppStateProvider>
    </QueryClientProvider>
  );
}
