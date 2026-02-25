import { useEffect, useRef } from 'react';
import { useGetReminders, type UIReminder } from './useProductivityQueries';

export interface ReminderNotification {
  reminder: UIReminder;
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
        // Combine date + time into a timestamp for comparison
        let reminderTime: number;
        try {
          const dateTimeStr = `${reminder.date}T${reminder.time}:00`;
          const d = new Date(dateTimeStr);
          reminderTime = d.getTime();
          if (isNaN(reminderTime)) return;
        } catch {
          return;
        }

        const reminderId = String(reminder.id);

        // Check if reminder is due (within 5 second tolerance)
        const isDue = reminderTime <= now && reminderTime > now - 5000;

        if (isDue && !notifiedRemindersRef.current.has(reminderId)) {
          notifiedRemindersRef.current.add(reminderId);
          onNotification({
            reminder,
            timestamp: now,
          });
        }
      });
    };

    checkIntervalRef.current = setInterval(checkReminders, 1000);
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
          .filter((r) => {
            try {
              const d = new Date(`${r.date}T${r.time}:00`);
              return !isNaN(d.getTime()) && d.getTime() > oneHourAgo;
            } catch {
              return false;
            }
          })
          .map((r) => String(r.id))
      );

      notifiedRemindersRef.current.forEach((id) => {
        if (!activeReminderIds.has(id)) {
          notifiedRemindersRef.current.delete(id);
        }
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, [reminders]);
}
