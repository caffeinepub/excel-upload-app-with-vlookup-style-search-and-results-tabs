import { useEffect, useRef } from 'react';
import { useGetReminders, type Reminder } from './useProductivityQueries';

export interface ReminderNotification {
  reminder: Reminder;
  timestamp: number;
}

type NotificationCallback = (notification: ReminderNotification) => void;

export function useInAppReminderNotifications(onNotification: NotificationCallback) {
  const { data: reminders = [] } = useGetReminders();
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      
      if (!reminders || reminders.length === 0) return;
      
      reminders.forEach((reminder) => {
        if (!reminder.isActive) return;
        
        // Safely convert reminder time to number
        let reminderTime: number;
        try {
          reminderTime = Number(reminder.time);
          if (isNaN(reminderTime)) return;
        } catch (error) {
          console.error('Invalid reminder time:', reminder.time);
          return;
        }
        
        const reminderId = String(reminder.id);
        
        // Check if reminder is due (within 1 second tolerance)
        const isDue = reminderTime <= now && reminderTime > now - 1000;
        
        // Check if we haven't already notified for this reminder
        if (isDue && !notifiedRemindersRef.current.has(reminderId)) {
          notifiedRemindersRef.current.add(reminderId);
          onNotification({
            reminder,
            timestamp: now,
          });
        }
      });
    };

    // Check every second
    checkIntervalRef.current = setInterval(checkReminders, 1000);

    // Initial check
    checkReminders();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [reminders, onNotification]);

  // Clean up old notified reminders (older than 1 hour)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!reminders || reminders.length === 0) return;
      
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const activeReminderIds = new Set(
        reminders
          .filter(r => {
            try {
              const reminderTime = Number(r.time);
              return !isNaN(reminderTime) && reminderTime > oneHourAgo;
            } catch {
              return false;
            }
          })
          .map(r => String(r.id))
      );
      
      notifiedRemindersRef.current.forEach((id) => {
        if (!activeReminderIds.has(id)) {
          notifiedRemindersRef.current.delete(id);
        }
      });
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [reminders]);
}
