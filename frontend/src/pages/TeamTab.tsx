import React, { useState, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useUserProfile';
import { useAvatarUrl } from '../hooks/useAvatarUrl';
import { getInitials } from '../lib/avatarUtils';
import TeamSidebar from '../components/team/TeamSidebar';
import ChannelView from '../components/team/ChannelView';
import DirectMessageView from '../components/team/DirectMessageView';
import ProfileEditorDialog from '../components/team/ProfileEditorDialog';
import StatusSelector from '../components/team/StatusSelector';
import CallPlaceholderModal from '../components/team/CallPlaceholderModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Phone,
  Video,
  Search,
  Hash,
  MessageSquare,
  UserPlus,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import {
  useListChannels,
  useCreateChannel,
  useGetUserStatuses,
  useGetAllUsers,
  TeamUser,
} from '../hooks/useTeamMessaging';
import { UserStatusKind } from '../backend';

function CallerAvatarButton({ onClick }: { onClick: () => void }) {
  const { data: profile } = useGetCallerUserProfile();
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName);

  return (
    <button
      onClick={onClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <Avatar className="h-8 w-8">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.displayName} />}
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

export default function TeamTab() {
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? '';

  const { data: callerProfile } = useGetCallerUserProfile();

  const { data: channels = [] } = useListChannels();
  const { data: userStatuses = [] } = useGetUserStatuses();
  const { data: allUsers = [] } = useGetAllUsers();
  const createChannel = useCreateChannel();

  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(null);
  const [selectedDmPrincipal, setSelectedDmPrincipal] = useState<string | null>(null);
  const [dmUsers, setDmUsers] = useState<TeamUser[]>([]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [callModal, setCallModal] = useState<'voice' | 'video' | null>(null);
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
        return [...prev, { principalStr, displayName: found?.displayName ?? '' }];
      });
    },
    [allUsers]
  );

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const id = await createChannel.mutateAsync(newChannelName.trim());
    setNewChannelName('');
    setShowCreateChannel(false);
    setSelectedChannelId(id);
    setSelectedDmPrincipal(null);
  };

  const handleStartDm = (principalStr: string, displayName: string) => {
    setDmUsers((prev) => {
      if (prev.find((u) => u.principalStr === principalStr)) return prev;
      return [...prev, { principalStr, displayName }];
    });
    setSelectedDmPrincipal(principalStr);
    setSelectedChannelId(null);
    setShowNewDm(false);
    setDmSearchQuery('');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const selectedDmUser = dmUsers.find((u) => u.principalStr === selectedDmPrincipal);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.principalStr !== callerPrincipal &&
      (u.displayName.toLowerCase().includes(dmSearchQuery.toLowerCase()) ||
        u.principalStr.toLowerCase().includes(dmSearchQuery.toLowerCase()))
  );

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
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm h-14 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedChannel ? (
              <>
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{selectedChannel.name}</span>
              </>
            ) : selectedDmUser ? (
              <>
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  {selectedDmUser.displayName || selectedDmUser.principalStr.slice(0, 12) + '…'}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Select a channel or DM</span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {(selectedChannel || selectedDmUser) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCallModal('voice')}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCallModal('video')}
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
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <StatusSelector />
            <CallerAvatarButton onClick={() => setShowProfileEditor(true)} />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedChannelId !== null ? (
            <ChannelView
              channelId={selectedChannelId}
              callerPrincipal={callerPrincipal}
              senderName={callerProfile?.displayName ?? 'User'}
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
                <h3 className="text-lg font-semibold mb-1">Welcome to Team Chat</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a channel from the sidebar to start messaging, or open a direct message
                  with a teammate.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateChannel(true)}>
                  <Hash className="h-4 w-4 mr-1" />
                  Create Channel
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNewDm(true)}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  New Message
                </Button>
              </div>
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
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={createChannel.isPending || !newChannelName.trim()}
            >
              {createChannel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New DM Dialog */}
      <Dialog open={showNewDm} onOpenChange={setShowNewDm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or principal…"
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {dmSearchQuery ? 'No users found' : 'No other users registered yet'}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.principalStr}
                    onClick={() => handleStartDm(u.principalStr, u.displayName)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(u.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.displayName || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.principalStr.slice(0, 20)}…
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share this link with teammates so they can join:
            </p>
            <div className="flex gap-2">
              <Input value={window.location.href} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyInviteLink}>
                {copiedInvite ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Editor */}
      <ProfileEditorDialog open={showProfileEditor} onOpenChange={setShowProfileEditor} />

      {/* Call Placeholder */}
      <CallPlaceholderModal
        open={callModal !== null}
        onClose={() => setCallModal(null)}
        type={callModal ?? 'voice'}
      />
    </div>
  );
}
