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
      return "bg-emerald-400";
    case UserStatusKind.away:
      return "bg-amber-400";
    case UserStatusKind.busy:
      return "bg-rose-500";
    default:
      return "bg-slate-500";
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
    <Avatar className="h-8 w-8 ring-2 ring-white/30 shadow-md">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.displayName} />}
      <AvatarFallback className="text-xs font-bold bg-indigo-400/40 text-white">
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
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/80 text-sm transition-all ${
        isSelected
          ? "bg-white/20 text-white font-medium shadow-sm"
          : "hover:bg-white/10 hover:text-white"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-[9px] bg-indigo-400/30 text-white font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#1e1b4b] ${statusColor(status)}`}
          title={statusLabel(status)}
        />
      </div>
      <span className="truncate flex-1 text-left">{displayName}</span>
      {unreadCount > 0 && (
        <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-red-500 text-white rounded-full flex-shrink-0">
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
      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/70 text-sm hover:bg-white/10 hover:text-white transition-all"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-[9px] bg-indigo-300/20 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#1e1b4b] ${statusColor(status)}`}
        />
      </div>
      <span className="truncate flex-1 text-left text-xs">{displayName}</span>
      <span className="text-[10px] text-white/30">{statusLabel(status)}</span>
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

  const sectionHeader =
    "text-white/40 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 mt-3 mb-0.5 select-none";

  return (
    <div
      className="flex flex-col h-full w-64 flex-shrink-0"
      style={{
        background: "linear-gradient(to bottom, #1e1b4b, #312e81)",
      }}
    >
      {/* Workspace Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <CallerAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {callerProfile?.displayName || "You"}
          </p>
          <p className="text-white/50 text-[11px]">Crystal Atlas</p>
        </div>
        {onlineCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/40">{onlineCount}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Channels Section */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`${sectionHeader} flex items-center gap-1.5 hover:text-white/70 transition-colors`}
                >
                  {channelsOpen ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5" />
                  )}
                  <Hash className="h-2.5 w-2.5" />
                  Channels
                </button>
              </CollapsibleTrigger>
              {channels.length > 0 && (
                <span className="ml-auto pr-3 text-white/30 text-[10px]">
                  {channels.length}
                </span>
              )}
            </div>
            <CollapsibleContent className="mt-0.5 space-y-0.5 px-2">
              {channels.length > 3 && (
                <div className="px-1 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                    <Input
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Find channel\u2026"
                      className="h-6 pl-6 text-[11px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>
              )}
              {filteredChannels.map((ch) => {
                const unread = unreadCounts[ch.id.toString()] ?? 0;
                const isSelected = selectedChannelId === ch.id;
                return (
                  <button
                    type="button"
                    key={ch.id.toString()}
                    onClick={() => onSelectChannel(ch.id)}
                    data-ocid="team.channel.button"
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? "bg-white/20 text-white font-medium shadow-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                    {unread > 0 && (
                      <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-red-500 text-white rounded-full flex-shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
              {filteredChannels.length === 0 && channelSearch && (
                <p className="text-[11px] text-white/30 px-3 py-1">
                  No channels match
                </p>
              )}
              <button
                type="button"
                onClick={onCreateChannel}
                data-ocid="team.channel.open_modal_button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/40 text-sm hover:bg-white/10 hover:text-white/70 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add channel</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Divider */}
          <div className="h-px mx-3 my-2 bg-white/10" />

          {/* DMs Section */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`${sectionHeader} flex items-center gap-1.5 hover:text-white/70 transition-colors`}
                >
                  {dmsOpen ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5" />
                  )}
                  <MessageSquare className="h-2.5 w-2.5" />
                  Direct Messages
                </button>
              </CollapsibleTrigger>
              {dmUsers.length > 0 && (
                <span className="ml-auto pr-3 text-white/30 text-[10px]">
                  {dmUsers.length}
                </span>
              )}
            </div>
            <CollapsibleContent className="mt-0.5 space-y-0.5 px-2">
              <div className="px-1 pb-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <Input
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Search DMs\u2026"
                    className="h-6 pl-6 text-[11px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
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
                <p className="text-[11px] text-white/30 px-3 py-1">
                  No conversations match
                </p>
              )}
              <button
                type="button"
                onClick={onStartNewDm}
                data-ocid="team.dm.open_modal_button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/40 text-sm hover:bg-white/10 hover:text-white/70 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New message</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Divider */}
          <div className="h-px mx-3 my-2 bg-white/10" />

          {/* Members Section */}
          {allUsers.length > 0 && (
            <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={`${sectionHeader} flex items-center gap-1.5 hover:text-white/70 transition-colors`}
                  >
                    {membersOpen ? (
                      <ChevronDown className="h-2.5 w-2.5" />
                    ) : (
                      <ChevronRight className="h-2.5 w-2.5" />
                    )}
                    <Users className="h-2.5 w-2.5" />
                    Members
                  </button>
                </CollapsibleTrigger>
                <span className="ml-auto pr-3 text-white/30 text-[10px]">
                  {allUsers.length}
                </span>
              </div>
              <CollapsibleContent className="mt-0.5 space-y-0.5 px-2">
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
