import { Pin } from "lucide-react";
import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";
import { useApproval } from "../../hooks/useApproval";
import {
  useDeleteChannelMessage,
  useEditChannelMessage,
  useGetChannelMessages,
  usePostChannelMessage,
} from "../../hooks/useTeamMessaging";
import { markMessagesSeen } from "../../lib/team/seenMessages";
import MessageFeed from "./MessageFeed";
import MessageInput from "./MessageInput";

interface ChannelViewProps {
  channelId: bigint;
  callerPrincipal: string;
  senderName: string;
}

export default function ChannelView({
  channelId,
  callerPrincipal,
  senderName,
}: ChannelViewProps) {
  const { data: messages = [], isLoading } = useGetChannelMessages(channelId);
  const postMessage = usePostChannelMessage();
  const deleteMessage = useDeleteChannelMessage();
  const editMessage = useEditChannelMessage();
  const { isAdmin } = useApproval();
  const channelIdStr = channelId.toString();
  const prevMessagesRef = useRef<string[]>([]);

  // Mark all visible messages as "seen" by current user
  useEffect(() => {
    if (!callerPrincipal || messages.length === 0) return;
    const messageIds = messages.map((m) => m.id.toString());
    const newIds = messageIds.filter(
      (id) => !prevMessagesRef.current.includes(id),
    );
    if (newIds.length > 0) {
      markMessagesSeen(channelIdStr, callerPrincipal, newIds);
      prevMessagesRef.current = messageIds;
    }
  }, [messages, callerPrincipal, channelIdStr]);

  const handleSend = async (
    text: string,
    fileUrl?: string,
    fileName?: string,
  ) => {
    await postMessage.mutateAsync({
      channelId,
      senderName,
      text,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
    });
  };

  const handleDelete = useCallback(
    (messageId: bigint) => {
      deleteMessage.mutate({ channelId, messageId });
    },
    [channelId, deleteMessage],
  );

  const handleEdit = useCallback(
    (messageId: bigint, newText: string) => {
      return editMessage.mutateAsync({ channelId, messageId, newText });
    },
    [channelId, editMessage],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Pinned area */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border/30 bg-muted/20 text-xs text-muted-foreground">
        <Pin className="h-3 w-3" />
        <span>No pinned messages</span>
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
          channelId={channelIdStr}
        />
      )}
      <MessageInput onSend={handleSend} placeholder="Message channel…" />
    </div>
  );
}
