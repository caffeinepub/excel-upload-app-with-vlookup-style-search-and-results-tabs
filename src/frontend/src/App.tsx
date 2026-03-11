import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { WelcomeSplash } from "./components/WelcomeSplash";
import { ApprovalGate } from "./components/auth/ApprovalGate";
import UserProfileSetup from "./components/auth/UserProfileSetup";
import BroadcastModal from "./components/broadcast/BroadcastModal";
import { AppErrorBoundary } from "./components/errors/AppErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";
import DailyRemindersStartupModal from "./components/reminders/DailyRemindersStartupModal";
import { ReminderEventsProvider } from "./context/ReminderEventsContext";
import { useIsCallerAdmin } from "./hooks/useApproval";
import { useGetActiveBroadcasts } from "./hooks/useBroadcasts";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useUserProfile";
import { AdminUsersTab } from "./pages/AdminUsersTab";
import AttendanceTab from "./pages/AttendanceTab";
import CalendarTab from "./pages/CalendarTab";
import CustomersTab from "./pages/CustomersTab";
import DepartmentsAdminTab from "./pages/DepartmentsAdminTab";
import DeskboardTab from "./pages/DeskboardTab";
import { HistoryTab } from "./pages/HistoryTab";
import { NotesTab } from "./pages/NotesTab";
import { ObserveUsersTab } from "./pages/ObserveUsersTab";
import { RegularExpenseTab } from "./pages/RegularExpenseTab";
import RemindersTab from "./pages/RemindersTab";
import { ResultsTab } from "./pages/ResultsTab";
import { SearchTab } from "./pages/SearchTab";
import TeamTab from "./pages/TeamTab";
import { TodoTab } from "./pages/TodoTab";
import { UpdateCheckingTab } from "./pages/UpdateCheckingTab";
import { UploadTab } from "./pages/UploadTab";
import UserProfileTab from "./pages/UserProfileTab";
import { AppStateProvider, useAppState } from "./state/appState";

import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Eye,
  History,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Search,
  StickyNote,
  Table2,
  Upload,
  UserCircle,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export type TabId =
  | "deskboard"
  | "upload"
  | "search"
  | "results"
  | "updateChecking"
  | "regularExpense"
  | "reminders"
  | "todo"
  | "notes"
  | "attendance"
  | "customers"
  | "calendar"
  | "history"
  | "adminUsers"
  | "observeUsers"
  | "team"
  | "departments"
  | "userProfile";

export interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export const ALL_TABS: TabDef[] = [
  {
    id: "deskboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
  { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
  { id: "results", label: "Results", icon: <Table2 className="h-4 w-4" /> },
  {
    id: "updateChecking",
    label: "Update Checking",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    id: "regularExpense",
    label: "Expenses",
    icon: <Wallet className="h-4 w-4" />,
  },
  { id: "reminders", label: "Reminders", icon: <Bell className="h-4 w-4" /> },
  { id: "todo", label: "Todo", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "notes", label: "Notes", icon: <StickyNote className="h-4 w-4" /> },
  {
    id: "attendance",
    label: "Attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
  },
  { id: "customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
  {
    id: "calendar",
    label: "Calendar",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  { id: "team", label: "Team", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  {
    id: "adminUsers",
    label: "Admin Users",
    icon: <UserCog className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "observeUsers",
    label: "Observe Users",
    icon: <Eye className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "userProfile",
    label: "My Profile",
    icon: <UserCircle className="h-4 w-4" />,
  },
  {
    id: "departments",
    label: "Departments",
    icon: <Building2 className="h-4 w-4" />,
    adminOnly: true,
  },
];

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { reset } = useAppState();

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
    isError: profileError,
  } = useGetCallerUserProfile();

  const [activeTab, setActiveTab] = useState<TabId>("deskboard");

  // Broadcast popup tracking
  const { data: activeBroadcasts = [] } =
    useGetActiveBroadcasts(isAuthenticated);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const currentBroadcast =
    isAuthenticated && activeBroadcasts.length > 0
      ? (activeBroadcasts[broadcastIndex] ?? null)
      : null;

  // Redirect to deskboard if not authenticated
  useEffect(() => {
    if (!isAuthenticated && activeTab !== "deskboard") {
      setActiveTab("deskboard");
    }
  }, [isAuthenticated, activeTab]);

  // Show profile setup if authenticated and profile is null, undefined, or errored.
  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    (profileFetched || profileError) &&
    (userProfile === null || userProfile === undefined || profileError);

  const handleTabChange = (tab: TabId) => setActiveTab(tab);

  const renderTab = () => {
    switch (activeTab) {
      case "deskboard":
        return <DeskboardTab />;
      case "upload":
        return <UploadTab />;
      case "search":
        return <SearchTab onSearchComplete={() => setActiveTab("results")} />;
      case "results":
        return (
          <ResultsTab
            onNavigateToUpdateChecking={() => setActiveTab("updateChecking")}
          />
        );
      case "updateChecking":
        return (
          <UpdateCheckingTab
            onComparisonComplete={() => setActiveTab("results")}
          />
        );
      case "regularExpense":
        return <RegularExpenseTab />;
      case "reminders":
        return <RemindersTab />;
      case "todo":
        return <TodoTab />;
      case "notes":
        return <NotesTab />;
      case "attendance":
        return <AttendanceTab />;
      case "customers":
        return <CustomersTab />;
      case "calendar":
        return <CalendarTab />;
      case "team":
        return <TeamTab />;
      case "history":
        return <HistoryTab />;
      case "adminUsers":
        return <AdminUsersTab />;
      case "observeUsers":
        return <ObserveUsersTab />;
      case "departments":
        return <DepartmentsAdminTab />;
      case "userProfile":
        return <UserProfileTab />;
      default:
        return <DeskboardTab />;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Initializing…</p>
        </div>
      </div>
    );
  }

  // suppress unused warning
  void reset;

  return (
    <ReminderEventsProvider>
      <UserProfileSetup open={showProfileSetup} />
      {isAuthenticated && <DailyRemindersStartupModal />}
      {isAuthenticated && userProfile && <WelcomeSplash />}
      {currentBroadcast && (
        <BroadcastModal
          broadcast={currentBroadcast}
          onDismissed={() => setBroadcastIndex((i) => i + 1)}
        />
      )}
      <AppLayout
        activeTab={activeTab}
        onNavigate={handleTabChange}
        isAdmin={isAdmin}
        tabs={ALL_TABS}
      >
        {isAuthenticated ? (
          <ApprovalGate>{renderTab()}</ApprovalGate>
        ) : (
          <DeskboardTab />
        )}
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
