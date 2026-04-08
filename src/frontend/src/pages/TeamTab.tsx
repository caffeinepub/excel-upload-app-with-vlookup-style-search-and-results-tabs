import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Check,
  Copy,
  Hash,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";
import { UserStatusKind } from "../backend";
import CallPlaceholderModal from "../components/team/CallPlaceholderModal";
import ChannelView from "../components/team/ChannelView";
import DirectMessageView from "../components/team/DirectMessageView";
import StatusSelector from "../components/team/StatusSelector";
import TeamSidebar from "../components/team/TeamSidebar";
import { useAvatarUrl } from "../hooks/useAvatarUrl";
import {
  type TeamUser,
  useCreateChannel,
  useGetAllUsers,
  useGetUserStatuses,
  useListChannels,
} from "../hooks/useTeamMessaging";
import {
  useGetCallerUserProfile,
  useGetUserProfile,
} from "../hooks/useUserProfile";
import { getInitials } from "../lib/avatarUtils";

const DM_USERS_KEY_PREFIX = "dmUsers_";

// Mark all team messages as seen in the dashboard widget
const LAST_SEEN_KEY = "teamMessagesLastSeen";
function markTeamMessagesSeen() {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {}
}

function loadDmUsers(principal: string): TeamUser[] {
  try {
    const raw = localStorage.getItem(`${DM_USERS_KEY_PREFIX}${principal}`);
    if (!raw) return [];
    return JSON.parse(raw) as TeamUser[];
  } catch {
    return [];
  }
}

function saveDmUsers(principal: string, users: TeamUser[]) {
  try {
    localStorage.setItem(
      `${DM_USERS_KEY_PREFIX}${principal}`,
      JSON.stringify(users),
    );
  } catch {
    // ignore
  }
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

interface MemberPanelItemProps {
  user: TeamUser;
  statuses: { principal: { toString(): string }; status: UserStatusKind }[];
  onStartDm: () => void;
}

function MemberPanelItem({ user, statuses, onStartDm }: MemberPanelItemProps) {
  const { data: profile } = useGetUserProfile(user.principalStr);
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const displayName = profile?.displayName || user.displayName || "User";
  const initials = getInitials(displayName);
  const statusEntry = statuses.find(
    (s) => s.principal.toString() === user.principalStr,
  );
  const status = statusEntry?.status ?? UserStatusKind.offline;

  return (
    <button
      type="button"
      onClick={onStartDm}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors text-left group"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(status)} ${
            status === UserStatusKind.online ? "animate-pulse" : ""
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">{statusLabel(status)}</p>
      </div>
    </button>
  );
}

export default function TeamTab() {
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: callerProfile } = useGetCallerUserProfile();
  const callerAvatarUrl = useAvatarUrl(callerProfile?.profilePicture ?? null);
  const callerInitials = getInitials(callerProfile?.displayName);

  const { data: channels = [] } = useListChannels();
  const { data: userStatuses = [] } = useGetUserStatuses();
  const { data: allUsers = [] } = useGetAllUsers();

  const callerStatusEntry = userStatuses.find(
    (s) => s.principal.toString() === callerPrincipal,
  );
  const callerStatus = callerStatusEntry?.status;
  const createChannel = useCreateChannel();

  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(
    null,
  );
  const [selectedDmPrincipal, setSelectedDmPrincipal] = useState<string | null>(
    null,
  );
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [dmUsers, setDmUsers] = useState<TeamUser[]>(() =>
    callerPrincipal ? loadDmUsers(callerPrincipal) : [],
  );

  useEffect(() => {
    if (callerPrincipal) {
      setDmUsers(loadDmUsers(callerPrincipal));
    }
  }, [callerPrincipal]);

  // Mark all messages as seen whenever Team tab is visited
  useEffect(() => {
    markTeamMessagesSeen();
  }, []);

  useEffect(() => {
    if (allUsers.length === 0) return;
    setDmUsers((prev) => {
      const updated = prev.map((dm) => {
        const fresh = allUsers.find((u) => u.principalStr === dm.principalStr);
        if (fresh?.displayName && fresh.displayName !== dm.displayName) {
          return { ...dm, displayName: fresh.displayName };
        }
        return dm;
      });
      const changed = updated.some(
        (u, i) => u.displayName !== prev[i]?.displayName,
      );
      if (changed && callerPrincipal) saveDmUsers(callerPrincipal, updated);
      return changed ? updated : prev;
    });
  }, [allUsers, callerPrincipal]);

  useEffect(() => {
    if (channels.length === 0) return;
    const pending = localStorage.getItem("pendingTeamChannel");
    if (pending) {
      try {
        const channelId = BigInt(pending);
        localStorage.removeItem("pendingTeamChannel");
        setSelectedChannelId(channelId);
        setSelectedDmPrincipal(null);
      } catch {
        localStorage.removeItem("pendingTeamChannel");
      }
    }
  }, [channels]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewDm, setShowNewDm] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [callModal, setCallModal] = useState<"voice" | "video" | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const handleSelectChannel = useCallback((id: bigint) => {
    setSelectedChannelId(id);
    setSelectedDmPrincipal(null);
    setSearchQuery("");
    setShowSearch(false);
    markTeamMessagesSeen();
  }, []);

  const handleSelectDm = useCallback(
    (principalStr: string) => {
      setSelectedDmPrincipal(principalStr);
      setSelectedChannelId(null);
      setSearchQuery("");
      setShowSearch(false);
      setDmUsers((prev) => {
        if (prev.find((u) => u.principalStr === principalStr)) return prev;
        const found = allUsers.find((u) => u.principalStr === principalStr);
        const newUser = { principalStr, displayName: found?.displayName ?? "" };
        const updated = [...prev, newUser];
        if (callerPrincipal) saveDmUsers(callerPrincipal, updated);
        return updated;
      });
    },
    [allUsers, callerPrincipal],
  );

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const id = await createChannel.mutateAsync(newChannelName.trim());
    setNewChannelName("");
    setShowCreateChannel(false);
    setSelectedChannelId(id);
    setSelectedDmPrincipal(null);
  };

  const handleStartDm = (principalStr: string, displayName: string) => {
    setDmUsers((prev) => {
      const exists = prev.find((u) => u.principalStr === principalStr);
      if (exists) return prev;
      const updated = [...prev, { principalStr, displayName }];
      if (callerPrincipal) saveDmUsers(callerPrincipal, updated);
      return updated;
    });
    setSelectedDmPrincipal(principalStr);
    setSelectedChannelId(null);
    setShowNewDm(false);
    setDmSearchQuery("");
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const selectedDmUser = dmUsers.find(
    (u) => u.principalStr === selectedDmPrincipal,
  );

  const selectedDmDisplayName =
    selectedDmUser?.displayName ||
    allUsers.find((u) => u.principalStr === selectedDmPrincipal)?.displayName ||
    (selectedDmPrincipal
      ? `User-${selectedDmPrincipal.slice(-4).toUpperCase()}`
      : "");

  const filteredUsers = allUsers.filter((u) => {
    if (u.principalStr === callerPrincipal) return false;
    if (!dmSearchQuery.trim()) return true;
    const q = dmSearchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.principalStr.toLowerCase().includes(q)
    );
  });

  const onlineCount = userStatuses.filter(
    (u) => u.status === UserStatusKind.online,
  ).length;

  const otherMembers = allUsers.filter(
    (u) => u.principalStr !== callerPrincipal,
  );

  return (
    <div
      className="flex h-[calc(100vh-8rem)] min-h-[500px] overflow-hidden rounded-2xl shadow-2xl border border-white/5 team-chat-entrance"
      data-ocid="team.panel"
    >
      {/* Sidebar */}
      <TeamSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={() => setShowCreateChannel(true)}
        dmUsers={dmUsers}
        selectedDmPrincipal={selectedDmPrincipal}
        onSelectDm={handleSelectDm}
        onStartNewDm={() => setShowNewDm(true)}
        onlineUsers={userStatuses}
        callerPrincipal={callerPrincipal}
        allUsers={allUsers}
        unreadCounts={{}}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#f8f9fb] dark:bg-[#0d0d14]">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 h-14 flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {selectedChannel ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-gray-900 truncate block">
                      {selectedChannel.name}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 hidden sm:block">
                  Channel
                </span>
              </>
            ) : selectedDmPrincipal !== null ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <span className="font-bold text-sm text-gray-900 truncate">
                    {selectedDmDisplayName}
                  </span>
                </div>
                <span className="text-xs text-gray-400 hidden sm:block">
                  Direct Message
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="text-sm text-gray-400 font-medium">
                  Select a channel or DM
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Search toggle */}
            {(selectedChannelId !== null || selectedDmPrincipal !== null) && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-lg transition-all ${
                  showSearch
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => {
                  setShowSearch((v) => !v);
                  if (showSearch) setSearchQuery("");
                }}
                title="Search messages"
                data-ocid="team.search.button"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}

            {(selectedChannelId !== null || selectedDmPrincipal !== null) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => setCallModal("voice")}
                  title="Voice call (coming soon)"
                  data-ocid="team.voice_call.button"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => setCallModal("video")}
                  title="Video call (coming soon)"
                  data-ocid="team.video_call.button"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Members panel toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-lg transition-all ${
                showMembersPanel
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => setShowMembersPanel((v) => !v)}
              title="Toggle members panel"
              data-ocid="team.members.toggle"
            >
              <Users className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setShowInviteDialog(true)}
              title="Invite teammates"
              data-ocid="team.invite.open_modal_button"
            >
              <UserPlus className="h-4 w-4" />
            </Button>

            {/* Status + More menu */}
            <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
              <StatusSelector currentStatus={callerStatus} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  data-ocid="team.more.dropdown_menu"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setShowMembersPanel(true)}
                  data-ocid="team.members.button"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Members
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={copyInviteLink}
                  data-ocid="team.copy_link.button"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Channel Link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearch(false);
                  }}
                  data-ocid="team.clear_search.button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Search
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search bar (inline) */}
        {showSearch && (
          <div className="px-4 py-2 border-b border-gray-100 bg-white/70 backdrop-blur-sm">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages…"
                className="pl-8 h-8 text-sm bg-gray-50 border-gray-200 rounded-lg"
                data-ocid="team.search.input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main chat + optional members panel */}
        <div className="flex flex-1 min-h-0">
          {/* Chat area */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {selectedChannelId !== null ? (
              <ChannelView
                channelId={selectedChannelId}
                callerPrincipal={callerPrincipal}
                senderName={
                  callerProfile?.displayName ||
                  `User-${callerPrincipal.slice(-4).toUpperCase()}`
                }
                searchQuery={searchQuery}
              />
            ) : selectedDmPrincipal !== null ? (
              <DirectMessageView
                otherPrincipal={selectedDmPrincipal}
                callerPrincipal={callerPrincipal}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                    <MessageSquare className="h-10 w-10 text-indigo-400" />
                  </div>
                  {onlineCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {onlineCount} online
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center max-w-xs">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Welcome to Crystal Atlas Chat
                  </h2>
                  <p className="text-sm text-gray-500">
                    Select a channel from the sidebar to start messaging, or
                    open a direct conversation.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewDm(true)}
                    className="gap-2 rounded-lg border-gray-200 hover:bg-gray-50"
                    data-ocid="team.welcome.dm_button"
                  >
                    <MessageSquare className="h-4 w-4" />
                    New Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateChannel(true)}
                    className="gap-2 rounded-lg border-gray-200 hover:bg-gray-50"
                    data-ocid="team.welcome.channel_button"
                  >
                    <Hash className="h-4 w-4" />
                    Create Channel
                  </Button>
                </div>
                {allUsers.filter((u) => u.principalStr !== callerPrincipal)
                  .length > 0 && (
                  <div className="w-full max-w-xs mt-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      Start a conversation
                    </p>
                    <div className="grid gap-1">
                      {allUsers
                        .filter((u) => u.principalStr !== callerPrincipal)
                        .slice(0, 4)
                        .map((u) => {
                          const label =
                            u.displayName ||
                            `User-${u.principalStr.slice(-4).toUpperCase()}`;
                          return (
                            <button
                              key={u.principalStr}
                              type="button"
                              onClick={() =>
                                handleStartDm(u.principalStr, label)
                              }
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-indigo-50 text-indigo-600 font-medium">
                                  {getInitials(label)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="text-sm font-medium text-gray-800">
                                  {label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right members panel */}
          {showMembersPanel && (
            <div
              className="w-64 flex-shrink-0 border-l border-gray-100 dark:border-white/5 bg-white dark:bg-gray-900 flex flex-col"
              style={{ animation: "slideInFromRight 0.2s ease" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">Members</p>
                  <p className="text-xs text-gray-400">
                    {allUsers.length} total · {onlineCount} online
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowMembersPanel(false)}
                  data-ocid="team.members.close_button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-2 px-1">
                  {/* Online section */}
                  {userStatuses.filter(
                    (s) =>
                      s.status === UserStatusKind.online &&
                      otherMembers.find(
                        (u) => u.principalStr === s.principal.toString(),
                      ),
                  ).length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">
                        Online
                      </p>
                      {otherMembers
                        .filter((u) => {
                          const s = userStatuses.find(
                            (st) => st.principal.toString() === u.principalStr,
                          );
                          return s?.status === UserStatusKind.online;
                        })
                        .map((u) => (
                          <MemberPanelItem
                            key={u.principalStr}
                            user={u}
                            statuses={userStatuses}
                            onStartDm={() => handleSelectDm(u.principalStr)}
                          />
                        ))}
                    </div>
                  )}
                  {/* Others */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">
                      All Members
                    </p>
                    {otherMembers.map((u) => (
                      <MemberPanelItem
                        key={u.principalStr}
                        user={u}
                        statuses={userStatuses}
                        onStartDm={() => handleSelectDm(u.principalStr)}
                      />
                    ))}
                    {/* Caller */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          {callerAvatarUrl && (
                            <AvatarImage
                              src={callerAvatarUrl}
                              alt={callerProfile?.displayName}
                            />
                          )}
                          <AvatarFallback className="text-xs bg-indigo-50 text-indigo-600">
                            {callerInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(callerStatus ?? UserStatusKind.offline)} ${callerStatus === UserStatusKind.online ? "animate-pulse" : ""}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {callerProfile?.displayName || "You"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {statusLabel(callerStatus ?? UserStatusKind.offline)}
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1 ml-1"
                          >
                            You
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="channel-name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
              autoFocus
              data-ocid="team.channel.input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateChannel(false)}
              data-ocid="team.channel.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={createChannel.isPending || !newChannelName.trim()}
              data-ocid="team.channel.submit_button"
            >
              {createChannel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New DM Dialog */}
      <Dialog open={showNewDm} onOpenChange={setShowNewDm}>
        <DialogContent className="sm:max-w-sm" data-ocid="team.dm.dialog">
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Search all registered users to start a conversation
          </p>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
                data-ocid="team.dm.search_input"
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1">
              All registered users ({filteredUsers.length})
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredUsers.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground text-center py-4"
                  data-ocid="team.dm.empty_state"
                >
                  {dmSearchQuery
                    ? "No users match your search"
                    : "No other users registered yet"}
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const displayLabel =
                    u.displayName ||
                    `User-${u.principalStr.slice(-4).toUpperCase()}`;
                  return (
                    <button
                      type="button"
                      key={u.principalStr}
                      onClick={() =>
                        handleStartDm(u.principalStr, displayLabel)
                      }
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                      data-ocid="team.dm.user.button"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(displayLabel)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {displayLabel}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDm(false)}
              data-ocid="team.dm.cancel_button"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-sm" data-ocid="team.invite.dialog">
          <DialogHeader>
            <DialogTitle>Invite to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share this link with teammates so they can join:
            </p>
            <div className="flex gap-2">
              <Input
                value={window.location.href}
                readOnly
                className="text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteLink}
                data-ocid="team.invite.button"
              >
                {copiedInvite ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowInviteDialog(false)}
              data-ocid="team.invite.close_button"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CallPlaceholderModal
        open={callModal !== null}
        onClose={() => setCallModal(null)}
        type={callModal ?? "voice"}
      />

      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .team-chat-entrance {
          animation: teamChatEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes teamChatEntrance {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
