import { Home, Upload, Search, FileText, GitCompare, History, Wallet, Bell, Calendar, CheckSquare, FileEdit, UserCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useIsCallerAdmin } from '../../hooks/useApproval';

interface DesktopSidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DesktopSidebarNav({ activeTab, onTabChange }: DesktopSidebarNavProps) {
  const { data: isAdmin } = useIsCallerAdmin();

  const mainItems = [
    { id: 'deskboard', icon: Home, label: 'Deskboard' },
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'results', icon: FileText, label: 'Results' },
    { id: 'update-checking', icon: GitCompare, label: 'Update Checking' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'regular-expense', icon: Wallet, label: 'Budget & Expenses' },
    { id: 'attendance', icon: UserCheck, label: 'Attendance' },
  ];

  const activityItems = [
    { id: 'reminders', icon: Bell, label: 'Reminders' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'todo', icon: CheckSquare, label: 'To-Do' },
    { id: 'notes', icon: FileEdit, label: 'Notes' },
  ];

  const adminItems = isAdmin
    ? [{ id: 'admin-users', icon: Users, label: 'User Management' }]
    : [];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mac-sidebar-container w-16 flex-shrink-0">
        <nav className="flex flex-col gap-2">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full h-12 flex items-center justify-center rounded-xl
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <Separator className="my-2" />

          <div className="text-xs text-muted-foreground text-center mb-1 px-1">
            Activities
          </div>

          {activityItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full h-12 flex items-center justify-center rounded-xl
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="text-xs text-muted-foreground text-center mb-1 px-1">
                Admin
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onTabChange(item.id)}
                        className={`
                          w-full h-12 flex items-center justify-center rounded-xl
                          transition-all duration-200
                          ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </TooltipProvider>
  );
}
