import { useMemo } from "react";
import { useReminderEvents } from "../../context/ReminderEventsContext";

interface CharacterDockProps {
  activeTab: string;
}

export function CharacterDock({ activeTab: _activeTab }: CharacterDockProps) {
  const { isReminderActive } = useReminderEvents();

  const statusLabel = useMemo(() => {
    if (isReminderActive) return "🎵 Reminder Active";
    return "🚀 Your Assistant";
  }, [isReminderActive]);

  return (
    <div className="character-dock-container">
      <div className="character-dock-canvas">
        <div className="character-dock-canvas-inner flex items-center justify-center">
          <img
            src="/assets/generated/mini-astronaut-transparent.dim_300x300.png"
            alt="Mini Astronaut Assistant"
            className="astronaut-float w-40 h-40 object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>
      <div className="character-dock-status">
        <p className="text-xs text-muted-foreground text-center">
          {statusLabel}
        </p>
      </div>
    </div>
  );
}
