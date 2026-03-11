import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import type React from "react";
import { ALL_TABS, type TabDef, type TabId } from "../../App";

interface DesktopSidebarNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isAdmin: boolean;
}

const MAIN_TABS: TabId[] = [
  "deskboard",
  "upload",
  "search",
  "results",
  "updateChecking",
];

const ACTIVITY_TABS: TabId[] = [
  "regularExpense",
  "reminders",
  "todo",
  "notes",
  "attendance",
  "customers",
  "calendar",
  "team",
  "history",
];

const ADMIN_TABS: TabId[] = ["adminUsers", "observeUsers", "departments"];

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  deskboard: <LayoutDashboard className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  results: <Table2 className="h-4 w-4" />,
  updateChecking: <RefreshCw className="h-4 w-4" />,
  regularExpense: <Wallet className="h-4 w-4" />,
  reminders: <Bell className="h-4 w-4" />,
  todo: <CheckSquare className="h-4 w-4" />,
  notes: <StickyNote className="h-4 w-4" />,
  attendance: <CalendarCheck className="h-4 w-4" />,
  customers: <Users className="h-4 w-4" />,
  calendar: <CalendarDays className="h-4 w-4" />,
  team: <MessageSquare className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  adminUsers: <UserCog className="h-4 w-4" />,
  observeUsers: <Eye className="h-4 w-4" />,
  departments: <Building2 className="h-4 w-4" />,
  userProfile: <UserCircle className="h-4 w-4" />,
};

function NavButton({
  tabId,
  label,
  active,
  onClick,
}: {
  tabId: TabId;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {TAB_ICONS[tabId]}
            <span className="truncate">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DesktopSidebarNav({
  activeTab,
  onTabChange,
  isAdmin,
}: DesktopSidebarNavProps) {
  const tabMap = Object.fromEntries(ALL_TABS.map((t) => [t.id, t])) as Record<
    TabId,
    TabDef
  >;

  const renderGroup = (ids: TabId[], label: string) => {
    const visible = ids.filter((id) => tabMap[id]);
    if (visible.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
          {label}
        </p>
        <div className="space-y-0.5">
          {visible.map((id) => (
            <NavButton
              key={id}
              tabId={id}
              label={tabMap[id].label}
              active={activeTab === id}
              onClick={() => onTabChange(id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <nav className="flex flex-col h-full py-3 px-2 overflow-y-auto">
      {renderGroup(MAIN_TABS, "Main")}
      {renderGroup(ACTIVITY_TABS, "Activities")}
      {isAdmin && renderGroup(ADMIN_TABS, "Admin")}
    </nav>
  );
}
