export type AnimationType = 
  | 'idle'
  | 'walk'
  | 'dance'
  | 'drinkWater'
  | 'jump'
  | 'call'
  | 'funnyMove'
  | 'typing'
  | 'thinking'
  | 'celebrate'
  | 'wave'
  | 'stretch'
  | 'nod';

export const TAB_ANIMATION_MAP: Record<string, AnimationType> = {
  'deskboard': 'idle',
  'upload': 'typing',
  'search': 'thinking',
  'results': 'celebrate',
  'update-checking': 'typing',
  'history': 'wave',
  'regular-expense': 'drinkWater',
  'attendance': 'walk',
  'reminders': 'call',
  'calendar': 'thinking',
  'todo': 'jump',
  'notes': 'typing',
  'admin-users': 'funnyMove',
};

export function getAnimationForTab(tabId: string): AnimationType {
  return TAB_ANIMATION_MAP[tabId] || 'idle';
}
