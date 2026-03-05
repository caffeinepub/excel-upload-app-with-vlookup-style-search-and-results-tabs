import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import {
  type Channel,
  type UserStatusEntry,
  UserStatusKind,
} from "../../backend";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import {
  useGetCallerUserProfile,
  useGetUserProfile,
} from "../../hooks/useUserProfile";
import { getInitials } from "../../lib/avatarUtils";

interface DmUser {
  principalStr: string;
  displayName: string;
}

interface TeamSidebarProps {
  channels: Channel[];
  selectedChannelId: bigint | null;
  onSelectChannel: (id: bigint) => void;
  onCreateChannel: () => void;
  dmUsers: DmUser[];
  selectedDmPrincipal: string | null;
  onSelectDm: (principalStr: string) => void;
  onStartNewDm: () => void;
  onlineUsers: UserStatusEntry[];
  callerPrincipal: string;
}

function statusColor(status: UserStatusKind | string): string {
  switch (status) {
    case UserStatusKind.online:
      return "bg-green-500";
    case UserStatusKind.away:
      return "bg-yellow-500";
    case UserStatusKind.busy:
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function CallerAvatar() {
  const { data: profile } = useGetCallerUserProfile();
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName);
  return (
    <Avatar className="h-8 w-8">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.displayName} />}
      <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

interface UserDmItemProps {
  user: DmUser;
  isSelected: boolean;
  onlineUsers: UserStatusEntry[];
  onClick: () => void;
}

function UserDmItem({
  user,
  isSelected,
  onlineUsers,
  onClick,
}: UserDmItemProps) {
  const { data: profile } = useGetUserProfile(user.principalStr);
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const displayName = profile?.displayName || user.displayName || "User";
  const initials = getInitials(displayName);

  const statusEntry = onlineUsers.find(
    (u) => u.principal.toString() === user.principalStr,
  );
  const status = statusEntry?.status ?? UserStatusKind.offline;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${statusColor(status)}`}
        />
      </div>
      <span className="truncate">{displayName}</span>
    </button>
  );
}

function OnlineUserItem({ entry }: { entry: UserStatusEntry }) {
  const { data: profile } = useGetUserProfile(entry.principal.toString());
  const displayName =
    profile?.displayName || `${entry.principal.toString().slice(0, 10)}…`;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/80">
      <div className="relative flex-shrink-0">
        <Circle className="h-5 w-5 text-sidebar-foreground/30" />
        <span
          className={`absolute inset-0 m-auto h-2 w-2 rounded-full ${statusColor(entry.status)}`}
        />
      </div>
      <span className="truncate text-xs">{displayName}</span>
    </div>
  );
}

export default function TeamSidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  dmUsers,
  selectedDmPrincipal,
  onSelectDm,
  onStartNewDm,
  onlineUsers,
  callerPrincipal: _callerPrincipal,
}: TeamSidebarProps) {
  const { data: callerProfile } = useGetCallerUserProfile();
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState("");

  const filteredDmUsers = dmUsers.filter((u) =>
    u.displayName.toLowerCase().includes(dmSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-sidebar-border">
        <CallerAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {callerProfile?.displayName || "You"}
          </p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            Team Chat
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-2 space-y-1">
          {/* Channels */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                {channelsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Channels
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 mt-1">
              {channels.map((ch) => (
                <button
                  type="button"
                  key={ch.id.toString()}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selectedChannelId === ch.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={onCreateChannel}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add channel</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Direct Messages */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors mt-2"
              >
                {dmsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Direct Messages
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1">
              <div className="px-2 pb-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Search DMs…"
                    className="h-7 pl-6 text-xs bg-sidebar-accent/30 border-sidebar-border"
                  />
                </div>
              </div>
              {filteredDmUsers.map((user) => (
                <UserDmItem
                  key={user.principalStr}
                  user={user}
                  isSelected={selectedDmPrincipal === user.principalStr}
                  onlineUsers={onlineUsers}
                  onClick={() => onSelectDm(user.principalStr)}
                />
              ))}
              <button
                type="button"
                onClick={onStartNewDm}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New message</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Online Users */}
          <Collapsible open={onlineOpen} onOpenChange={setOnlineOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors mt-2"
              >
                {onlineOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Users className="h-3 w-3 ml-0.5" />
                Online (
                {
                  onlineUsers.filter((u) => u.status === UserStatusKind.online)
                    .length
                }
                )
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {onlineUsers
                .filter((u) => u.status !== UserStatusKind.offline)
                .map((u) => (
                  <OnlineUserItem key={u.principal.toString()} entry={u} />
                ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
