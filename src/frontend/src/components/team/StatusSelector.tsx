import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useEffect, useRef, useState } from "react";
import { UserStatusKind } from "../../backend";
import { useSetUserStatus } from "../../hooks/useTeamMessaging";

interface StatusSelectorProps {
  currentStatus?: UserStatusKind | string;
  onStatusChange?: (status: UserStatusKind) => void;
}

const STATUS_OPTIONS: {
  value: UserStatusKind;
  label: string;
  color: string;
}[] = [
  { value: UserStatusKind.online, label: "Online", color: "bg-green-500" },
  { value: UserStatusKind.away, label: "Away", color: "bg-yellow-500" },
  { value: UserStatusKind.busy, label: "Busy", color: "bg-red-500" },
  { value: UserStatusKind.offline, label: "Offline", color: "bg-gray-400" },
];

const STATUS_STORAGE_KEY = "team_user_status";
// How long (ms) to keep the user's manually chosen status before allowing
// the polling data to update it again. Set to a generous 60 seconds so
// normal usage never causes an unexpected revert.
const STATUS_LOCK_MS = 60_000;

export function getStatusColor(status: UserStatusKind | string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-400";
}

function readStoredStatus(): UserStatusKind | null {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status: UserStatusKind; setAt: number };
    return parsed.status ?? null;
  } catch {
    return null;
  }
}

function writeStoredStatus(status: UserStatusKind) {
  try {
    localStorage.setItem(
      STATUS_STORAGE_KEY,
      JSON.stringify({ status, setAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

function isStatusLocked(): boolean {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { status: UserStatusKind; setAt: number };
    return Date.now() - parsed.setAt < STATUS_LOCK_MS;
  } catch {
    return false;
  }
}

export default function StatusSelector({
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  const setStatus = useSetUserStatus();

  // Initialize from localStorage first so we don't flash "Offline" on load
  const [localStatus, setLocalStatus] = useState<UserStatusKind>(() => {
    const stored = readStoredStatus();
    return stored ?? UserStatusKind.online;
  });

  // Track whether we've already synced the initial status to the backend
  const initialSyncDone = useRef(false);

  const setStatusMutate = setStatus.mutate;

  // On first mount, set our status in the backend to match our local/stored preference
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect intentional
  useEffect(() => {
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      const stored = readStoredStatus();
      if (stored) {
        setStatusMutate(stored);
      } else {
        setStatusMutate(UserStatusKind.online);
        writeStoredStatus(UserStatusKind.online);
      }
    }
  }, [setStatusMutate]);

  // Only allow polling to update the displayed status when:
  // 1. There's no pending mutation
  // 2. The status lock has expired (user hasn't recently changed it manually)
  const resolvedStatus = (() => {
    if (setStatus.isPending) return localStatus;
    if (isStatusLocked()) return localStatus;
    if (currentStatus) return currentStatus as UserStatusKind;
    return localStatus;
  })();

  const handleChange = (val: string) => {
    const statusKind = val as UserStatusKind;
    setLocalStatus(statusKind); // immediate UI update
    writeStoredStatus(statusKind); // persist + lock
    setStatus.mutate(statusKind);
    if (onStatusChange) onStatusChange(statusKind);
  };

  return (
    <Select
      value={resolvedStatus}
      onValueChange={handleChange}
      data-ocid="team.status.select"
    >
      <SelectTrigger
        className="w-36 h-8 text-xs"
        data-ocid="team.status.trigger"
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(resolvedStatus)}`}
          />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.color}`}
              />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
