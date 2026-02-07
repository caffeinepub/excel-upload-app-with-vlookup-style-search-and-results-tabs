import { Upload, Search, FileText, FileCheck, History, Bell, Calendar, CheckSquare, StickyNote, Home, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DesktopSidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DesktopSidebarNav({ activeTab, onTabChange }: DesktopSidebarNavProps) {
  const primaryMenuItems = [
    { id: 'deskboard', label: 'Deskboard', icon: Home },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'update-checking', label: 'Update', icon: FileCheck },
    { id: 'history', label: 'History', icon: History },
    { id: 'regular-expense', label: 'Regular Expense', icon: Wallet },
  ];

  const activityItems = [
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'todo', label: 'To-Do', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-20 flex-shrink-0 sticky top-8 self-start">
        <nav className="mac-sidebar-container">
          {/* Primary Menu */}
          <div className="space-y-1">
            {primaryMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full h-14 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary hover:bg-primary/15'
                          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <Separator className="my-4" />

          {/* Activity Section */}
          <div className="space-y-1">
            <div className="px-2 mb-2">
              <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Activities
              </p>
            </div>
            {activityItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full h-12 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-accent/80 text-accent-foreground'
                          : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] font-medium leading-tight">{item.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
