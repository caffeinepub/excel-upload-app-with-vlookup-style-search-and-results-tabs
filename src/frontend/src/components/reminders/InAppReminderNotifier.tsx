import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useInAppReminderNotifications, ReminderNotification } from '../../hooks/useInAppReminderNotifications';

export function InAppReminderNotifier() {
  const [notification, setNotification] = useState<ReminderNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio
    audioRef.current = new Audio('/assets/ringtones/iphone-like-chime.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  const handleNotification = useCallback((notif: ReminderNotification) => {
    setNotification(notif);
    setIsOpen(true);
    
    // Play ringtone
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Failed to play notification sound:', error);
      });
    }
  }, []);

  useInAppReminderNotifications(handleNotification);

  const handleClose = () => {
    setIsOpen(false);
    // Stop audio if still playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  if (!notification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mac-dialog reminder-notification-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary animate-pulse" />
            Reminder
          </DialogTitle>
          <DialogDescription>
            {new Date(Number(notification.reminder.time)).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{notification.reminder.title}</h3>
            {notification.reminder.description && (
              <p className="text-sm text-muted-foreground">{notification.reminder.description}</p>
            )}
          </div>
          <Button onClick={handleClose} className="w-full">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
