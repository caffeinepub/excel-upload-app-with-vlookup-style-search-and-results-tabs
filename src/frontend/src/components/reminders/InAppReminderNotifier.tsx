import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useInAppReminderNotifications, ReminderNotification } from '../../hooks/useInAppReminderNotifications';
import { TechHeroRadioCharacter } from './TechHeroRadioCharacter';

export function InAppReminderNotifier() {
  const [notification, setNotification] = useState<ReminderNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio
    audioRef.current = new Audio('/assets/ringtones/iphone-like-chime.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  const handleNotification = useCallback((notif: ReminderNotification) => {
    setNotification(notif);
    setIsVisible(true);
    
    // Play ringtone
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Failed to play notification sound:', error);
      });
    }
  }, []);

  useInAppReminderNotifications(handleNotification);

  const handleDismiss = () => {
    setIsVisible(false);
    // Stop audio if still playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Clear notification after animation completes
    setTimeout(() => setNotification(null), 300);
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="reminder-notification-toast pointer-events-auto">
        <div className="flex items-start gap-3">
          <TechHeroRadioCharacter />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-primary reminder-bell-pulse" />
              <h3 className="font-semibold text-sm">General Reminder</h3>
            </div>
            
            <p className="text-sm font-medium mb-1 line-clamp-2">
              {notification.reminder.title}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {new Date(Number(notification.reminder.time)).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
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
        
        <Button
          onClick={handleDismiss}
          className="w-full mt-3"
          size="sm"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
