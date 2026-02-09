import { useMemo } from 'react';
import { ArmoredHero3DCanvas } from './ArmoredHero3DCanvas';
import { useReminderEvents } from '../../context/ReminderEventsContext';
import { getAnimationForTab, type AnimationType } from '../../lib/character/tabAnimationMapping';

interface CharacterDockProps {
  activeTab: string;
}

export function CharacterDock({ activeTab }: CharacterDockProps) {
  const { isReminderActive } = useReminderEvents();

  const currentAnimation: AnimationType = useMemo(() => {
    // Reminder dance always takes priority
    if (isReminderActive) {
      return 'dance';
    }
    
    // Otherwise use tab-specific animation
    return getAnimationForTab(activeTab);
  }, [isReminderActive, activeTab]);

  return (
    <div className="character-dock-container">
      <div className="character-dock-canvas">
        <div className="character-dock-canvas-inner">
          <ArmoredHero3DCanvas animation={currentAnimation} />
        </div>
      </div>
      <div className="character-dock-status">
        <p className="text-xs text-muted-foreground text-center">
          {isReminderActive ? '🎵 Reminder Active' : '🤖 Your Assistant'}
        </p>
      </div>
    </div>
  );
}
