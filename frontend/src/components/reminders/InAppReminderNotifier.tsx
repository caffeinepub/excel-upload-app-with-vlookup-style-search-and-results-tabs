import { useCallback, useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Volume2 } from 'lucide-react';
import { useInAppReminderNotifications, ReminderNotification } from '../../hooks/useInAppReminderNotifications';
import { useReminderEvents } from '../../context/ReminderEventsContext';

export function InAppReminderNotifier() {
  const { activeReminder, setActiveReminder, dismissReminder } = useReminderEvents();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEnableSound, setShowEnableSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio
    audioRef.current = new Audio('/assets/ringtones/iphone-like-chime.mp3');
    audioRef.current.preload = 'auto';

    // Check if sound was previously enabled
    const savedSoundPref = localStorage.getItem('reminderSoundEnabled');
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true');
    }
  }, []);

  const playSound = useCallback(() => {
    if (!audioRef.current || !soundEnabled) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((error) => {
      console.error('Failed to play notification sound:', error);
      if (error.name === 'NotAllowedError') {
        setShowEnableSound(true);
      }
    });
  }, [soundEnabled]);

  const handleNotification = useCallback(
    (notif: ReminderNotification) => {
      setActiveReminder(notif.reminder);
      playSound();
    },
    [setActiveReminder, playSound]
  );

  useInAppReminderNotifications(handleNotification);

  const handleDismiss = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dismissReminder();
    setShowEnableSound(false);
  }, [dismissReminder]);

  const handleEnableSound = useCallback(() => {
    setSoundEnabled(true);
    localStorage.setItem('reminderSoundEnabled', 'true');
    setShowEnableSound(false);
    playSound();
  }, [playSound]);

  if (!activeReminder) return null;

  // Format the reminder time from date + time strings
  const reminderDisplayTime = (() => {
    try {
      const d = new Date(`${activeReminder.date}T${activeReminder.time}:00`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      }
    } catch {
      // fall through
    }
    return `${activeReminder.date} ${activeReminder.time}`;
  })();

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="reminder-notification-toast pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary reminder-bell-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">General Reminder</h3>
            </div>

            <p className="text-sm font-medium mb-1 line-clamp-2">
              {activeReminder.message}
            </p>

            <p className="text-xs text-muted-foreground">
              {reminderDisplayTime}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {showEnableSound && (
          <Button
            onClick={handleEnableSound}
            variant="outline"
            size="sm"
            className="w-full mt-3"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Enable Sound
          </Button>
        )}

        <Button onClick={handleDismiss} className="w-full mt-3" size="sm">
          Dismiss
        </Button>
      </div>
    </div>
  );
}
