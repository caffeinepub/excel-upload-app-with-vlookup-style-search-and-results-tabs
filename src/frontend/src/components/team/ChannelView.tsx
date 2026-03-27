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
  searchQuery?: string;
}

export default function ChannelView({
  channelId,
  callerPrincipal,
  senderName,
  searchQuery = "",
}: ChannelViewProps) {
  const { data: messages = [], isLoading } = useGetChannelMessages(channelId);
  const postMessage = usePostChannelMessage();
  const deleteMessage = useDeleteChannelMessage();
  const editMessage = useEditChannelMessage();
  const { isAdmin } = useApproval();
  const channelIdStr = channelId.toString();
  const prevMessagesRef = useRef<string[]>([]);
  const postedSeenReceiptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storageKey = `seenPosted_${channelIdStr}`;
    try {
      const posted = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      ) as string[];
      postedSeenReceiptsRef.current = new Set(posted);
    } catch {
      postedSeenReceiptsRef.current = new Set();
    }
  }, [channelIdStr]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: postMessage is stable mutation
  useEffect(() => {
    if (!callerPrincipal || messages.length === 0) return;
    const messageIds = messages.map((m) => m.id.toString());
    const newIds = messageIds.filter(
      (id) => !prevMessagesRef.current.includes(id),
    );
    if (newIds.length > 0) {
      markMessagesSeen(channelIdStr, callerPrincipal, newIds);
      prevMessagesRef.current = messageIds;

      const storageKey = `seenPosted_${channelIdStr}`;
      for (const msg of messages) {
        const msgId = msg.id.toString();
        const senderId = "senderId" in msg ? msg.senderId.toString() : "";
        if (
          senderId !== callerPrincipal &&
          !postedSeenReceiptsRef.current.has(msgId) &&
          !msg.text?.startsWith("__seen:") &&
          !msg.text?.startsWith("__react:") &&
          !msg.text?.startsWith("__unreact:")
        ) {
          postedSeenReceiptsRef.current.add(msgId);
          postMessage
            .mutateAsync({
              channelId,
              senderName,
              text: `__seen:${msgId}`,
              fileUrl: null,
              fileName: null,
            })
            .catch(() => {
              postedSeenReceiptsRef.current.delete(msgId);
            });
        }
      }
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify([...postedSeenReceiptsRef.current]),
        );
      } catch {
        // ignore
      }
    }
  }, [messages, callerPrincipal, channelIdStr, channelId, senderName]);

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

  const handleReact = useCallback(
    async (msgId: bigint, emoji: string, add: boolean) => {
      const prefix = add ? "__react:" : "__unreact:";
      await postMessage.mutateAsync({
        channelId,
        senderName,
        text: `${prefix}${msgId}:${emoji}:${senderName}`,
        fileUrl: null,
        fileName: null,
      });
    },
    [channelId, senderName, postMessage],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Pinned area */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-black/5 bg-white/40 text-xs text-gray-400">
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
          searchQuery={searchQuery}
          onReact={handleReact}
          callerDisplayName={senderName}
        />
      )}
      <MessageInput onSend={handleSend} placeholder="Message channel…" />
    </div>
  );
}
