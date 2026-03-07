import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import type { TeamUser } from "../../hooks/useTeamMessaging";
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
  unreadCounts?: Record<string, number>;
  allUsers?: TeamUser[];
}

function statusColor(status: UserStatusKind | string): string {
  switch (status) {
    case UserStatusKind.online:
      return "bg-emerald-500";
    case UserStatusKind.away:
      return "bg-amber-400";
    case UserStatusKind.busy:
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function statusLabel(status: UserStatusKind | string): string {
  switch (status) {
    case UserStatusKind.online:
      return "Online";
    case UserStatusKind.away:
      return "Away";
    case UserStatusKind.busy:
      return "Busy";
    default:
      return "Offline";
  }
}

function CallerAvatar() {
  const { data: profile } = useGetCallerUserProfile();
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName);
  return (
    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.displayName} />}
      <AvatarFallback className="text-xs bg-primary/25 text-primary font-bold">
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
  unreadCount?: number;
}

function UserDmItem({
  user,
  isSelected,
  onlineUsers,
  onClick,
  unreadCount = 0,
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
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xs bg-primary/15 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${statusColor(status)}`}
          title={statusLabel(status)}
        />
      </div>
      <span className="truncate flex-1 text-left">{displayName}</span>
      {unreadCount > 0 && (
        <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-primary text-primary-foreground rounded-full flex-shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}

interface MemberItemProps {
  user: TeamUser;
  onlineUsers: UserStatusEntry[];
  onClick: () => void;
}

function MemberItem({ user, onlineUsers, onClick }: MemberItemProps) {
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
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-5 w-5">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-sidebar ${statusColor(status)}`}
        />
      </div>
      <span className="truncate flex-1 text-left">{displayName}</span>
    </button>
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
  unreadCounts = {},
  allUsers = [],
}: TeamSidebarProps) {
  const { data: callerProfile } = useGetCallerUserProfile();
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [dmSearch, setDmSearch] = useState("");

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(channelSearch.toLowerCase()),
  );

  const filteredDmUsers = dmUsers.filter((u) =>
    u.displayName.toLowerCase().includes(dmSearch.toLowerCase()),
  );

  const onlineCount = onlineUsers.filter(
    (u) => u.status === UserStatusKind.online,
  ).length;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-sm">
        <CallerAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate tracking-tight">
            {callerProfile?.displayName || "You"}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate font-medium uppercase tracking-wider">
            Team Chat
          </p>
        </div>
        {onlineCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-sidebar-foreground/50">
              {onlineCount}
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-3 space-y-0.5">
          {/* Channels Section */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
              >
                {channelsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Hash className="h-3 w-3" />
                <span>Channels</span>
                {channels.length > 0 && (
                  <span className="ml-auto text-[10px] opacity-60">
                    {channels.length}
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {/* Channel search */}
              {channels.length > 3 && (
                <div className="px-1 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Find channel…"
                      className="h-6 pl-6 text-[11px] bg-sidebar-accent/20 border-sidebar-border/50 focus:ring-1"
                    />
                  </div>
                </div>
              )}
              {filteredChannels.map((ch) => {
                const unread = unreadCounts[ch.id.toString()] ?? 0;
                return (
                  <button
                    type="button"
                    key={ch.id.toString()}
                    onClick={() => onSelectChannel(ch.id)}
                    data-ocid="team.channel.button"
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                      selectedChannelId === ch.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                    {unread > 0 && (
                      <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-primary text-primary-foreground rounded-full flex-shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
              {filteredChannels.length === 0 && channelSearch && (
                <p className="text-[11px] text-sidebar-foreground/40 px-2.5 py-1">
                  No channels match
                </p>
              )}
              <button
                type="button"
                onClick={onCreateChannel}
                data-ocid="team.channel.open_modal_button"
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add channel</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Separator */}
          <div className="h-px bg-sidebar-border/40 my-1 mx-2" />

          {/* Direct Messages Section */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
              >
                {dmsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <MessageSquare className="h-3 w-3" />
                <span>Direct Messages</span>
                {dmUsers.length > 0 && (
                  <span className="ml-auto text-[10px] opacity-60">
                    {dmUsers.length}
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              <div className="px-1 pb-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Search DMs…"
                    className="h-6 pl-6 text-[11px] bg-sidebar-accent/20 border-sidebar-border/50 focus:ring-1"
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
                  unreadCount={unreadCounts[user.principalStr] ?? 0}
                />
              ))}
              {filteredDmUsers.length === 0 && dmSearch && (
                <p className="text-[11px] text-sidebar-foreground/40 px-2.5 py-1">
                  No conversations match
                </p>
              )}
              <button
                type="button"
                onClick={onStartNewDm}
                data-ocid="team.dm.open_modal_button"
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New message</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Separator */}
          <div className="h-px bg-sidebar-border/40 my-1 mx-2" />

          {/* Members Section */}
          {allUsers.length > 0 && (
            <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
                >
                  {membersOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Users className="h-3 w-3" />
                  <span>Members</span>
                  <span className="ml-auto text-[10px] opacity-60">
                    {allUsers.length}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5">
                {allUsers.map((user) => (
                  <MemberItem
                    key={user.principalStr}
                    user={user}
                    onlineUsers={onlineUsers}
                    onClick={() => onSelectDm(user.principalStr)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
