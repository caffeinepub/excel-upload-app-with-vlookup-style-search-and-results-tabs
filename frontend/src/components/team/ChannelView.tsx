import React from 'react';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import { useGetChannelMessages, usePostChannelMessage } from '../../hooks/useTeamMessaging';
import { Loader2 } from 'lucide-react';

interface ChannelViewProps {
  channelId: bigint;
  callerPrincipal: string;
  senderName: string;
}

export default function ChannelView({ channelId, callerPrincipal, senderName }: ChannelViewProps) {
  const { data: messages = [], isLoading } = useGetChannelMessages(channelId);
  const postMessage = usePostChannelMessage();

  const handleSend = async (text: string, fileUrl?: string, fileName?: string) => {
    await postMessage.mutateAsync({
      channelId,
      senderName,
      text,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageFeed messages={messages} callerPrincipal={callerPrincipal} />
      )}
      <MessageInput onSend={handleSend} placeholder="Send a message…" />
    </div>
  );
}
