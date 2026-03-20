const SEEN_STORAGE_KEY = "channelSeenMessages";

export function markMessagesSeen(
  channelId: string,
  callerPrincipal: string,
  messageIds: string[],
) {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    const stored: Record<string, Record<string, string[]>> = raw
      ? (JSON.parse(raw) as Record<string, Record<string, string[]>>)
      : {};
    if (!stored[channelId]) stored[channelId] = {};
    for (const msgId of messageIds) {
      const existing = stored[channelId][msgId] ?? [];
      if (!existing.includes(callerPrincipal)) {
        stored[channelId][msgId] = [...existing, callerPrincipal];
      }
    }
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore storage errors
  }
}

export function getSeenBy(channelId: string, messageId: string): string[] {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as Record<string, Record<string, string[]>>;
    return stored[channelId]?.[messageId] ?? [];
  } catch {
    return [];
  }
}
