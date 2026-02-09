import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { InAppReminderNotifier } from '../reminders/InAppReminderNotifier';
import { CharacterDock } from '../character/CharacterDock';

interface AppLayoutProps {
  children: ReactNode;
  onNavigate?: (tab: string) => void;
  activeTab: string;
}

export function AppLayout({ children, onNavigate, activeTab }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppHeader onNavigate={onNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {children}
          </div>
          <div className="hidden xl:block flex-shrink-0">
            <CharacterDock activeTab={activeTab} />
          </div>
        </div>
      </main>
      <footer className="border-t mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026. Built with ❤️ using{' '}
          <a
            href="https://caffeine.ai"
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
