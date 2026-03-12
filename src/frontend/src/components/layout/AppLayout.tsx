import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { TabDef, TabId } from "../../App";
import { CharacterDock } from "../character/CharacterDock";
import { InAppReminderNotifier } from "../reminders/InAppReminderNotifier";
import { AppHeader } from "./AppHeader";
import DesktopSidebarNav from "./DesktopSidebarNav";

interface AppLayoutProps {
  children: ReactNode;
  onNavigate?: (tab: TabId) => void;
  activeTab: TabId;
  isAdmin: boolean;
  tabs: TabDef[];
}

export function AppLayout({
  children,
  onNavigate,
  activeTab,
  isAdmin,
}: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleMobileNavChange = (tab: TabId) => {
    setMobileNavOpen(false);
    if (onNavigate) onNavigate(tab);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      <AppHeader
        onNavigate={onNavigate as ((tab: string) => void) | undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border bg-background overflow-y-auto">
          <DesktopSidebarNav
            activeTab={activeTab}
            onTabChange={onNavigate ?? (() => {})}
            isAdmin={isAdmin}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">{children}</div>
              <div className="hidden xl:block flex-shrink-0">
                <CharacterDock activeTab={activeTab} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t py-4 shrink-0">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "crystal-atlas")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
      <InAppReminderNotifier />

      {/* Mobile hamburger FAB - only visible below lg */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="fixed bottom-6 left-4 z-50 lg:hidden flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
        data-ocid="mobile-nav.open_modal_button"
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0"
          data-ocid="mobile-nav.sheet"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-left text-base">Navigation</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-16">
            <DesktopSidebarNav
              activeTab={activeTab}
              onTabChange={handleMobileNavChange}
              isAdmin={isAdmin}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
