import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserStatusKind } from '../../backend';
import { useSetUserStatus } from '../../hooks/useTeamMessaging';

interface StatusSelectorProps {
  currentStatus?: UserStatusKind | string;
  onStatusChange?: (status: UserStatusKind) => void;
}

const STATUS_OPTIONS: { value: UserStatusKind; label: string; color: string }[] = [
  { value: UserStatusKind.online, label: 'Online', color: 'bg-green-500' },
  { value: UserStatusKind.away, label: 'Away', color: 'bg-yellow-500' },
  { value: UserStatusKind.busy, label: 'Busy', color: 'bg-red-500' },
  { value: UserStatusKind.offline, label: 'Offline', color: 'bg-gray-400' },
];

export function getStatusColor(status: UserStatusKind | string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? 'bg-gray-400';
}

export default function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  const setStatus = useSetUserStatus();

  const handleChange = (val: string) => {
    const statusKind = val as UserStatusKind;
    if (onStatusChange) {
      onStatusChange(statusKind);
    } else {
      setStatus.mutate(statusKind);
    }
  };

  const resolvedStatus = (currentStatus as UserStatusKind) ?? UserStatusKind.offline;

  return (
    <Select value={resolvedStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(resolvedStatus)}`} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
