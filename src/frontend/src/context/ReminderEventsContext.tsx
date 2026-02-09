import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Reminder } from '../hooks/useProductivityQueries';

interface ReminderEventState {
  activeReminder: Reminder | null;
  isReminderActive: boolean;
  setActiveReminder: (reminder: Reminder | null) => void;
  dismissReminder: () => void;
}

const ReminderEventsContext = createContext<ReminderEventState | undefined>(undefined);

export function ReminderEventsProvider({ children }: { children: ReactNode }) {
  const [activeReminder, setActiveReminderState] = useState<Reminder | null>(null);

  const setActiveReminder = useCallback((reminder: Reminder | null) => {
    setActiveReminderState(reminder);
  }, []);

  const dismissReminder = useCallback(() => {
    setActiveReminderState(null);
  }, []);

  const value: ReminderEventState = {
    activeReminder,
    isReminderActive: activeReminder !== null,
    setActiveReminder,
    dismissReminder,
  };

  return (
    <ReminderEventsContext.Provider value={value}>
      {children}
    </ReminderEventsContext.Provider>
  );
}

export function useReminderEvents() {
  const context = useContext(ReminderEventsContext);
  if (context === undefined) {
    throw new Error('useReminderEvents must be used within a ReminderEventsProvider');
  }
  return context;
}
