const DM_SEEN_STORAGE_KEY = "dmSeenMessages";

function getConvKey(principalA: string, principalB: string): string {
  return [principalA, principalB].sort().join("__");
}

export function markDmMessagesSeen(
  otherPrincipal: string,
  callerPrincipal: string,
  messageIds: string[],
) {
  try {
    const convKey = getConvKey(otherPrincipal, callerPrincipal);
    const raw = localStorage.getItem(DM_SEEN_STORAGE_KEY);
    const stored: Record<string, Record<string, string[]>> = raw
      ? (JSON.parse(raw) as Record<string, Record<string, string[]>>)
      : {};
    if (!stored[convKey]) stored[convKey] = {};
    for (const msgId of messageIds) {
      const existing = stored[convKey][msgId] ?? [];
      if (!existing.includes(callerPrincipal)) {
        stored[convKey][msgId] = [...existing, callerPrincipal];
      }
    }
    localStorage.setItem(DM_SEEN_STORAGE_KEY, JSON.stringify(stored));
  } catch {}
}

export function getDmSeenBy(
  otherPrincipal: string,
  callerPrincipal: string,
  messageId: string,
): string[] {
  try {
    const convKey = getConvKey(otherPrincipal, callerPrincipal);
    const raw = localStorage.getItem(DM_SEEN_STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as Record<string, Record<string, string[]>>;
    return stored[convKey]?.[messageId] ?? [];
  } catch {
    return [];
  }
}
