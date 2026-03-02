import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useIsCallerAdmin } from './hooks/useApproval';
import { AppLayout } from './components/layout/AppLayout';
import UserProfileSetup from './components/auth/UserProfileSetup';
import { useGetCallerUserProfile } from './hooks/useUserProfile';
import { ReminderEventsProvider } from './context/ReminderEventsContext';
import DailyRemindersStartupModal from './components/reminders/DailyRemindersStartupModal';
import { AppStateProvider, useAppState } from './state/appState';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';

// Pages
import { UploadTab } from './pages/UploadTab';
import { SearchTab } from './pages/SearchTab';
import { ResultsTab } from './pages/ResultsTab';
import { UpdateCheckingTab } from './pages/UpdateCheckingTab';
import { RegularExpenseTab } from './pages/RegularExpenseTab';
import RemindersTab from './pages/RemindersTab';
import { TodoTab } from './pages/TodoTab';
import { NotesTab } from './pages/NotesTab';
import { AttendanceTab } from './pages/AttendanceTab';
import CustomersTab from './pages/CustomersTab';
import CalendarTab from './pages/CalendarTab';
import { HistoryTab } from './pages/HistoryTab';
import { AdminUsersTab } from './pages/AdminUsersTab';
import { ObserveUsersTab } from './pages/ObserveUsersTab';
import TeamTab from './pages/TeamTab';
import DeskboardTab from './pages/DeskboardTab';

import {
  LayoutDashboard,
  Upload,
  Search,
  Table2,
  RefreshCw,
  Wallet,
  Bell,
  CheckSquare,
  StickyNote,
  CalendarCheck,
  CalendarDays,
  History,
  Users,
  Eye,
  UserCog,
  MessageSquare,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export type TabId =
  | 'deskboard'
  | 'upload'
  | 'search'
  | 'results'
  | 'updateChecking'
  | 'regularExpense'
  | 'reminders'
  | 'todo'
  | 'notes'
  | 'attendance'
  | 'customers'
  | 'calendar'
  | 'history'
  | 'adminUsers'
  | 'observeUsers'
  | 'team';

export interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export const ALL_TABS: TabDef[] = [
  { id: 'deskboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'upload', label: 'Upload', icon: <Upload className="h-4 w-4" /> },
  { id: 'search', label: 'Search', icon: <Search className="h-4 w-4" /> },
  { id: 'results', label: 'Results', icon: <Table2 className="h-4 w-4" /> },
  { id: 'updateChecking', label: 'Update Checking', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'regularExpense', label: 'Expenses', icon: <Wallet className="h-4 w-4" /> },
  { id: 'reminders', label: 'Reminders', icon: <Bell className="h-4 w-4" /> },
  { id: 'todo', label: 'Todo', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="h-4 w-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'team', label: 'Team', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
  { id: 'adminUsers', label: 'Admin Users', icon: <UserCog className="h-4 w-4" />, adminOnly: true },
  { id: 'observeUsers', label: 'Observe Users', icon: <Eye className="h-4 w-4" />, adminOnly: true },
];

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isAdmin } = useIsCallerAdmin();
  const { reset } = useAppState();

  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();

  const [activeTab, setActiveTab] = useState<TabId>('deskboard');

  const showProfileSetup =
    isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  const handleTabChange = (tab: TabId) => setActiveTab(tab);

  const renderTab = () => {
    switch (activeTab) {
      case 'deskboard': return <DeskboardTab />;
      case 'upload': return <UploadTab />;
      case 'search': return <SearchTab onSearchComplete={() => setActiveTab('results')} />;
      case 'results': return <ResultsTab onNavigateToUpdateChecking={() => setActiveTab('updateChecking')} />;
      case 'updateChecking': return <UpdateCheckingTab onComparisonComplete={() => setActiveTab('results')} />;
      case 'regularExpense': return <RegularExpenseTab />;
      case 'reminders': return <RemindersTab />;
      case 'todo': return <TodoTab />;
      case 'notes': return <NotesTab />;
      case 'attendance': return <AttendanceTab />;
      case 'customers': return <CustomersTab />;
      case 'calendar': return <CalendarTab />;
      case 'team': return <TeamTab />;
      case 'history': return <HistoryTab />;
      case 'adminUsers': return <AdminUsersTab />;
      case 'observeUsers': return <ObserveUsersTab />;
      default: return <DeskboardTab />;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // suppress unused warning
  void reset;

  return (
    <ReminderEventsProvider>
      <UserProfileSetup open={showProfileSetup} />
      {isAuthenticated && <DailyRemindersStartupModal />}
      <AppLayout
        activeTab={activeTab}
        onNavigate={handleTabChange}
        isAdmin={isAdmin ?? false}
        tabs={ALL_TABS}
      >
        {renderTab()}
      </AppLayout>
    </ReminderEventsProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        {({ reset }) => (
          <AppErrorBoundary onReset={reset}>
            <AppContent />
          </AppErrorBoundary>
        )}
      </AppStateProvider>
    </QueryClientProvider>
  );
}
