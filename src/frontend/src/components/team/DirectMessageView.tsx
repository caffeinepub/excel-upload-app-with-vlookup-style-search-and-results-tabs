import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Principal } from "@dfinity/principal";
import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";
import { UserStatusKind } from "../../backend";
import { useApproval } from "../../hooks/useApproval";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import {
  useDeleteDirectMessage,
  useEditDirectMessage,
  useGetDirectMessages,
  useGetUserStatuses,
  useSendDirectMessage,
} from "../../hooks/useTeamMessaging";
import { useGetUserProfile } from "../../hooks/useUserProfile";
import { useGetCallerUserProfile } from "../../hooks/useUserProfile";
import { getInitials } from "../../lib/avatarUtils";
import { markDmMessagesSeen } from "../../lib/team/dmSeen";
import MessageFeed from "./MessageFeed";
import MessageInput from "./MessageInput";

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

interface DirectMessageViewProps {
  otherPrincipal: string;
  callerPrincipal: string;
  searchQuery?: string;
}

export default function DirectMessageView({
  otherPrincipal,
  callerPrincipal,
  searchQuery = "",
}: DirectMessageViewProps) {
  const { data: messages = [], isLoading } =
    useGetDirectMessages(otherPrincipal);
  const sendDm = useSendDirectMessage();
  const deleteMessage = useDeleteDirectMessage();
  const editMessage = useEditDirectMessage();
  const { isAdmin } = useApproval();
  const prevIdsRef = useRef<string[]>([]);

  const { data: otherProfile } = useGetUserProfile(otherPrincipal);
  const { data: callerProfile } = useGetCallerUserProfile();
  const { data: statuses = [] } = useGetUserStatuses();
  const avatarUrl = useAvatarUrl(otherProfile?.profilePicture ?? null);

  const otherStatusEntry = statuses.find(
    (s) => s.principal.toString() === otherPrincipal,
  );
  const otherStatus = otherStatusEntry?.status ?? UserStatusKind.offline;
  const displayName =
    otherProfile?.displayName ||
    `User-${otherPrincipal.slice(-4).toUpperCase()}`;
  const initials = getInitials(displayName);
  const callerDisplayName =
    callerProfile?.displayName || callerPrincipal.slice(0, 8);

  useEffect(() => {
    if (!callerPrincipal || messages.length === 0) return;
    const ids = messages.map((m) => m.id.toString());
    const newIds = ids.filter((id) => !prevIdsRef.current.includes(id));
    if (newIds.length > 0) {
      markDmMessagesSeen(otherPrincipal, callerPrincipal, newIds);
      prevIdsRef.current = ids;
    }
  }, [messages, callerPrincipal, otherPrincipal]);

  const handleSend = async (
    text: string,
    fileUrl?: string,
    fileName?: string,
  ) => {
    await sendDm.mutateAsync({
      toPrincipal: Principal.fromText(otherPrincipal),
      text,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
    });
  };

  const handleDelete = useCallback(
    (messageId: bigint) => {
      deleteMessage.mutate({ otherPrincipalStr: otherPrincipal, messageId });
    },
    [otherPrincipal, deleteMessage],
  );

  const handleEdit = useCallback(
    (messageId: bigint, newText: string) => {
      return editMessage.mutateAsync({
        otherPrincipalStr: otherPrincipal,
        messageId,
        newText,
      });
    },
    [otherPrincipal, editMessage],
  );

  const handleReact = useCallback(
    async (msgId: bigint, emoji: string, add: boolean) => {
      const prefix = add ? "__react:" : "__unreact:";
      await sendDm.mutateAsync({
        toPrincipal: Principal.fromText(otherPrincipal),
        text: `${prefix}${msgId}:${emoji}:${callerDisplayName}`,
        fileUrl: null,
        fileName: null,
      });
    },
    [otherPrincipal, callerDisplayName, sendDm],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Other user header bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b border-black/5"
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs bg-violet-100 text-violet-600 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${statusColor(
              otherStatus,
            )} ${otherStatus === UserStatusKind.online ? "animate-pulse" : ""}`}
            title={statusLabel(otherStatus)}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight text-gray-900">
            {displayName}
          </p>
          <p className="text-[11px] text-gray-400 leading-tight">
            {statusLabel(otherStatus)}
          </p>
        </div>
        <div className="ml-auto text-xs text-gray-300 font-medium">
          Direct Message
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageFeed
          messages={messages}
          callerPrincipal={callerPrincipal}
          isAdmin={isAdmin}
          onDeleteMessage={handleDelete}
          onEditMessage={handleEdit}
          otherPrincipal={otherPrincipal}
          searchQuery={searchQuery}
          onReact={handleReact}
          callerDisplayName={callerDisplayName}
        />
      )}
      <MessageInput
        onSend={handleSend}
        placeholder={`Message ${displayName}…`}
      />
    </div>
  );
}
