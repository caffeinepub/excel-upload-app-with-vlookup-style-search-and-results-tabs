import { TabId } from '../../App';

export type AnimationType = 'idle' | 'walk' | 'dance' | 'jump' | 'wave' | 'celebrate' | 'thinking';

export const TAB_ANIMATION_MAP: Record<TabId, AnimationType> = {
  deskboard: 'idle',
  upload: 'wave',
  search: 'thinking',
  results: 'celebrate',
  updateChecking: 'thinking',
  regularExpense: 'idle',
  reminders: 'jump',
  todo: 'idle',
  notes: 'thinking',
  attendance: 'walk',
  customers: 'wave',
  calendar: 'idle',
  team: 'walk',
  history: 'idle',
  adminUsers: 'celebrate',
  observeUsers: 'thinking',
};

export function getAnimationForTab(tabId: string): AnimationType {
  return TAB_ANIMATION_MAP[tabId as TabId] ?? 'idle';
}

export function getTabAnimation(tabId: TabId): AnimationType {
  return TAB_ANIMATION_MAP[tabId] ?? 'idle';
}
