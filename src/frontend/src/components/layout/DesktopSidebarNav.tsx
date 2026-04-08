import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Atom,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Eye,
  FlaskConical,
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
import { useTeamUnreadCount } from "../deskboard/TeamMessagesWidget";

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
  "departments",
  "history",
  "drugAnalyzer",
  "tgaCalculator",
  "xrpdCalculator",
  "patentTracker",
];

const ADMIN_TABS: TabId[] = ["adminUsers", "observeUsers"];

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
  drugAnalyzer: <FlaskConical className="h-4 w-4" />,
  tgaCalculator: <Calculator className="h-4 w-4" />,
  xrpdCalculator: <Atom className="h-4 w-4" />,
  patentTracker: <BookOpen className="h-4 w-4" />,
};

function NavButton({
  tabId,
  label,
  active,
  onClick,
  badge,
}: {
  tabId: TabId;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
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
            <div className="relative flex-shrink-0">
              {TAB_ICONS[tabId]}
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </div>
            <span className="truncate flex-1">{label}</span>
            {badge != null && badge > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
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
  const teamUnread = useTeamUnreadCount();

  const tabMap = Object.fromEntries(ALL_TABS.map((t) => [t.id, t])) as Record<
    TabId,
    TabDef
  >;

  const getBadge = (id: TabId): number | undefined => {
    if (id === "team") return teamUnread > 0 ? teamUnread : undefined;
    return undefined;
  };

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
              badge={getBadge(id)}
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
