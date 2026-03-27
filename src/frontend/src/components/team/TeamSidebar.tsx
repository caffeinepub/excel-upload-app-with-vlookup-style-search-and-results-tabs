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
    <Avatar className="h-9 w-9 ring-2 ring-white/20 shadow-md">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.displayName} />}
      <AvatarFallback className="text-xs font-bold bg-indigo-400/30 text-white">
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
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
        isSelected
          ? "bg-white/20 text-white font-semibold shadow-sm backdrop-blur-sm"
          : "text-white/65 hover:bg-white/12 hover:text-white"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-7 w-7">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-[9px] bg-indigo-400/30 text-white font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#1a1744] ${statusColor(
            status,
          )} ${status === UserStatusKind.online ? "animate-pulse" : ""}`}
        />
      </div>
      <span className="truncate flex-1 text-left">{displayName}</span>
      {unreadCount > 0 && (
        <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-rose-500 text-white rounded-full flex-shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
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
    "text-white/35 text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 flex items-center gap-1.5 select-none";

  return (
    <div
      className="flex flex-col h-full w-64 flex-shrink-0"
      style={{
        background:
          "linear-gradient(175deg, #0f0c29 0%, #302b63 55%, #24243e 100%)",
      }}
    >
      {/* Workspace Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
        <CallerAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate leading-tight">
            {callerProfile?.displayName || "You"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-white/40 text-[11px] font-medium">
              Crystal Atlas
            </span>
            {onlineCount > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-[10px] text-white/35 tabular-nums">
                  {onlineCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-3">
          {/* Channels Section */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <div className="flex items-center justify-between pr-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`${sectionHeader} hover:text-white/60 transition-colors flex-1`}
                >
                  {channelsOpen ? (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  )}
                  <Hash className="h-3 w-3" />
                  Channels
                  {channels.length > 0 && (
                    <span className="ml-1.5 text-white/25 text-[9px]">
                      {channels.length}
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChannel();
                }}
                className="h-5 w-5 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title="Add channel"
                data-ocid="team.channel.open_modal_button"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <CollapsibleContent className="mt-1 space-y-0.5 px-2">
              {channels.length > 3 && (
                <div className="px-1 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25" />
                    <Input
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Find channel…"
                      className="h-7 pl-6 text-[11px] bg-white/6 border-white/8 text-white placeholder:text-white/25 rounded-lg focus:ring-1 focus:ring-indigo-400/40"
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                      isSelected
                        ? "bg-white/18 text-white font-semibold shadow-sm"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Hash
                      className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-indigo-300" : "opacity-50"}`}
                    />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                    {unread > 0 && (
                      <Badge className="h-4 min-w-[1rem] px-1 text-[10px] bg-rose-500 text-white rounded-full flex-shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
              {filteredChannels.length === 0 && channelSearch && (
                <p className="text-[11px] text-white/25 px-3 py-1">
                  No channels match
                </p>
              )}
              {channels.length === 0 && (
                <button
                  type="button"
                  onClick={onCreateChannel}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/35 text-sm hover:bg-white/8 hover:text-white/60 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create first channel</span>
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Divider */}
          <div className="h-px mx-4 my-3 bg-white/8" />

          {/* DMs Section */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <div className="flex items-center justify-between pr-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`${sectionHeader} hover:text-white/60 transition-colors flex-1`}
                >
                  {dmsOpen ? (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  )}
                  <MessageSquare className="h-3 w-3" />
                  Direct Messages
                  {dmUsers.length > 0 && (
                    <span className="ml-1.5 text-white/25 text-[9px]">
                      {dmUsers.length}
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartNewDm();
                }}
                className="h-5 w-5 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title="New message"
                data-ocid="team.dm.open_modal_button"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <CollapsibleContent className="mt-1 space-y-0.5 px-2">
              <div className="px-1 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25" />
                  <Input
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Search DMs…"
                    className="h-7 pl-6 text-[11px] bg-white/6 border-white/8 text-white placeholder:text-white/25 rounded-lg focus:ring-1 focus:ring-indigo-400/40"
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
                <p className="text-[11px] text-white/25 px-3 py-1">
                  No conversations match
                </p>
              )}
              {dmUsers.length === 0 && (
                <button
                  type="button"
                  onClick={onStartNewDm}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/35 text-sm hover:bg-white/8 hover:text-white/60 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Start a conversation</span>
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Members Section */}
          {allUsers.length > 0 && (
            <>
              <div className="h-px mx-4 my-3 bg-white/8" />
              <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
                <div className="flex items-center">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={`${sectionHeader} hover:text-white/60 transition-colors w-full`}
                    >
                      {membersOpen ? (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                      <Users className="h-3 w-3" />
                      Members
                      <span className="ml-1.5 text-white/25 text-[9px]">
                        {allUsers.length}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-1 space-y-0.5 px-2">
                  {allUsers.map((user) => {
                    const statusEntry = onlineUsers.find(
                      (u) => u.principal.toString() === user.principalStr,
                    );
                    const status =
                      statusEntry?.status ?? UserStatusKind.offline;
                    return (
                      <button
                        type="button"
                        key={user.principalStr}
                        onClick={() => onSelectDm(user.principalStr)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-white/55 text-sm hover:bg-white/10 hover:text-white transition-all"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-indigo-400/20 flex items-center justify-center">
                            <span className="text-[9px] text-white font-bold">
                              {getInitials(user.displayName)}
                            </span>
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[#1a1744] ${statusColor(status)}`}
                          />
                        </div>
                        <span className="truncate flex-1 text-left text-xs">
                          {user.displayName}
                        </span>
                        <span className="text-[9px] text-white/25">
                          {statusLabel(status)}
                        </span>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom workspace info */}
      <div className="px-4 py-2.5 border-t border-white/8">
        <p className="text-[10px] text-white/20 text-center">
          Crystal Atlas Workspace
        </p>
      </div>
    </div>
  );
}
