import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Principal } from "@dfinity/principal";
import { Loader2 } from "lucide-react";
import React, { useCallback } from "react";
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
import { getInitials } from "../../lib/avatarUtils";
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
}

export default function DirectMessageView({
  otherPrincipal,
  callerPrincipal,
}: DirectMessageViewProps) {
  const { data: messages = [], isLoading } =
    useGetDirectMessages(otherPrincipal);
  const sendDm = useSendDirectMessage();
  const deleteMessage = useDeleteDirectMessage();
  const editMessage = useEditDirectMessage();
  const { isAdmin } = useApproval();

  // Get the other user's profile and status
  const { data: otherProfile } = useGetUserProfile(otherPrincipal);
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Other user mini header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/10">
        <div className="relative flex-shrink-0">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(otherStatus)}`}
            title={statusLabel(otherStatus)}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">
            {displayName}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {statusLabel(otherStatus)}
          </p>
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
        />
      )}
      <MessageInput
        onSend={handleSend}
        placeholder={`Message ${displayName}…`}
      />
    </div>
  );
}
