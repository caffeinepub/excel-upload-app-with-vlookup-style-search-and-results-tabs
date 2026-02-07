import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { InAppReminderNotifier } from '../reminders/InAppReminderNotifier';

interface AppLayoutProps {
  children: ReactNode;
  onNavigate?: (tab: string) => void;
}

export function AppLayout({ children, onNavigate }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppHeader onNavigate={onNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {children}
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
