import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Check,
  Copy,
  Hash,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  UserPlus,
  Video,
} from "lucide-react";
import React, { useState, useCallback, useEffect } from "react";
import { UserStatusKind } from "../backend";
import CallPlaceholderModal from "../components/team/CallPlaceholderModal";
import ChannelView from "../components/team/ChannelView";
import DirectMessageView from "../components/team/DirectMessageView";
import ProfileEditorDialog from "../components/team/ProfileEditorDialog";
import StatusSelector from "../components/team/StatusSelector";
import TeamSidebar from "../components/team/TeamSidebar";
import { useAvatarUrl } from "../hooks/useAvatarUrl";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type TeamUser,
  useCreateChannel,
  useGetAllUsers,
  useGetUserStatuses,
  useListChannels,
} from "../hooks/useTeamMessaging";
import { useGetCallerUserProfile } from "../hooks/useUserProfile";
import { getInitials } from "../lib/avatarUtils";

function CallerAvatarButton({ onClick }: { onClick: () => void }) {
  const { data: profile } = useGetCallerUserProfile();
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName);

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <Avatar className="h-8 w-8">
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={profile?.displayName} />
        )}
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

// Key used to persist DM conversation list in localStorage
const DM_USERS_KEY_PREFIX = "dmUsers_";

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

export default function TeamTab() {
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: callerProfile } = useGetCallerUserProfile();

  const { data: channels = [] } = useListChannels();
  const { data: userStatuses = [] } = useGetUserStatuses();
  const { data: allUsers = [] } = useGetAllUsers();

  // Resolve caller's current status from polling data
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

  // Persist DM user list so conversations survive page refresh
  const [dmUsers, setDmUsers] = useState<TeamUser[]>(() =>
    callerPrincipal ? loadDmUsers(callerPrincipal) : [],
  );

  // Reload persisted DM list when caller principal is resolved
  useEffect(() => {
    if (callerPrincipal) {
      setDmUsers(loadDmUsers(callerPrincipal));
    }
  }, [callerPrincipal]);

  // Sync allUsers displayNames into dmUsers so names update if profile changes
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
      // Only update if something changed
      if (updated.some((u, i) => u.displayName !== prev[i]?.displayName)) {
        return updated;
      }
      return prev;
    });
  }, [allUsers]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [callModal, setCallModal] = useState<"voice" | "video" | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const handleSelectChannel = useCallback((id: bigint) => {
    setSelectedChannelId(id);
    setSelectedDmPrincipal(null);
  }, []);

  const handleSelectDm = useCallback(
    (principalStr: string) => {
      setSelectedDmPrincipal(principalStr);
      setSelectedChannelId(null);
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

  // If selected DM user's display name is empty, try to get it from allUsers
  const selectedDmDisplayName =
    selectedDmUser?.displayName ||
    allUsers.find((u) => u.principalStr === selectedDmPrincipal)?.displayName ||
    (selectedDmPrincipal
      ? `User-${selectedDmPrincipal.slice(-4).toUpperCase()}`
      : "");

  // Filter out the caller; if search query is empty show all registered users
  const filteredUsers = allUsers.filter((u) => {
    if (u.principalStr === callerPrincipal) return false;
    if (!dmSearchQuery.trim()) return true;
    const q = dmSearchQuery.toLowerCase();
    const nameMatch = u.displayName.toLowerCase().includes(q);
    const principalMatch = u.principalStr.toLowerCase().includes(q);
    return nameMatch || principalMatch;
  });

  return (
    <div className="flex h-full overflow-hidden bg-background">
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
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm h-14 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedChannel ? (
              <>
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  {selectedChannel.name}
                </span>
              </>
            ) : selectedDmPrincipal !== null ? (
              <>
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  {selectedDmDisplayName}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a channel or DM
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {(selectedChannel || selectedDmPrincipal !== null) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCallModal("voice")}
                  data-ocid="team.voice.button"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCallModal("video")}
                  data-ocid="team.video.button"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInviteDialog(true)}
              data-ocid="team.invite.button"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <StatusSelector currentStatus={callerStatus} />
            <CallerAvatarButton onClick={() => setShowProfileEditor(true)} />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedChannelId !== null ? (
            <ChannelView
              channelId={selectedChannelId}
              callerPrincipal={callerPrincipal}
              senderName={callerProfile?.displayName ?? "User"}
            />
          ) : selectedDmPrincipal !== null ? (
            <DirectMessageView
              otherPrincipal={selectedDmPrincipal}
              callerPrincipal={callerPrincipal}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="rounded-full bg-primary/10 p-6">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Welcome to Team Chat
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a channel from the sidebar to start messaging, or open
                  a direct message with a teammate.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateChannel(true)}
                  data-ocid="team.create-channel.button"
                >
                  <Hash className="h-4 w-4 mr-1" />
                  Create Channel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewDm(true)}
                  data-ocid="team.new-dm.button"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  New Message
                </Button>
              </div>
              {allUsers.filter((u) => u.principalStr !== callerPrincipal)
                .length > 0 && (
                <div className="mt-4 w-full max-w-sm">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                    Registered Users — click to start a DM
                  </p>
                  <div className="space-y-1">
                    {allUsers
                      .filter((u) => u.principalStr !== callerPrincipal)
                      .slice(0, 5)
                      .map((u) => {
                        const label =
                          u.displayName ||
                          `User-${u.principalStr.slice(-4).toUpperCase()}`;
                        return (
                          <button
                            key={u.principalStr}
                            type="button"
                            onClick={() => handleStartDm(u.principalStr, label)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(label)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
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
                        <p className="text-xs text-muted-foreground truncate">
                          {u.principalStr.slice(0, 16)}…
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

      {/* Profile Editor */}
      <ProfileEditorDialog
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
      />

      {/* Call Placeholder */}
      <CallPlaceholderModal
        open={callModal !== null}
        onClose={() => setCallModal(null)}
        type={callModal ?? "voice"}
      />
    </div>
  );
}
