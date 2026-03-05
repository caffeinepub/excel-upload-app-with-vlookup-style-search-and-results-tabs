import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useState } from "react";
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

export function getStatusColor(status: UserStatusKind | string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-400";
}

export default function StatusSelector({
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  const setStatus = useSetUserStatus();

  // Local state for immediate UI feedback — syncs prop on next render cycle
  const [localStatus, setLocalStatus] = useState<UserStatusKind>(
    (currentStatus as UserStatusKind) ?? UserStatusKind.offline,
  );

  // When parent prop changes (e.g. from polling), keep local in sync only if
  // there's no pending mutation in flight
  const resolvedStatus = setStatus.isPending
    ? localStatus
    : ((currentStatus as UserStatusKind) ?? localStatus);

  const handleChange = (val: string) => {
    const statusKind = val as UserStatusKind;
    setLocalStatus(statusKind); // immediate UI update
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
        data-ocid="team.status.select"
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
