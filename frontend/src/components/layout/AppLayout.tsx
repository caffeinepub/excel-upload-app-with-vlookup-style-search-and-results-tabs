import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { InAppReminderNotifier } from '../reminders/InAppReminderNotifier';
import { CharacterDock } from '../character/CharacterDock';
import DesktopSidebarNav from './DesktopSidebarNav';
import { TabId, TabDef } from '../../App';

interface AppLayoutProps {
  children: ReactNode;
  onNavigate?: (tab: TabId) => void;
  activeTab: TabId;
  isAdmin: boolean;
  tabs: TabDef[];
}

export function AppLayout({ children, onNavigate, activeTab, isAdmin, tabs }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      <AppHeader onNavigate={onNavigate as ((tab: string) => void) | undefined} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border bg-background overflow-y-auto">
          <DesktopSidebarNav
            activeTab={activeTab}
            onTabChange={onNavigate ?? (() => {})}
            isAdmin={isAdmin}
            tabs={tabs}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">
                {children}
              </div>
              <div className="hidden xl:block flex-shrink-0">
                <CharacterDock activeTab={activeTab} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t py-4 shrink-0">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== 'undefined' ? window.location.hostname : 'crystal-atlas')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
      <InAppReminderNotifier />
    </div>
  );
}
