import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChannelMessage, DirectMessage } from '../../backend';
import { useGetUserProfile } from '../../hooks/useUserProfile';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { getInitials } from '../../lib/avatarUtils';
import { FileText, Download } from 'lucide-react';

type Message = ChannelMessage | DirectMessage;

function isChannelMessage(msg: Message): msg is ChannelMessage {
  return 'channelId' in msg;
}

function getSenderId(msg: Message): string {
  if (isChannelMessage(msg)) return msg.senderId.toString();
  return msg.fromPrincipal.toString();
}

function getSenderName(msg: Message): string {
  if (isChannelMessage(msg)) return msg.senderName;
  return '';
}

interface MessageAvatarProps {
  principalStr: string;
  fallbackName: string;
}

function MessageAvatar({ principalStr, fallbackName }: MessageAvatarProps) {
  const { data: profile } = useGetUserProfile(principalStr);
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName || fallbackName);
  const displayName = profile?.displayName || fallbackName;

  return (
    <Avatar className="h-8 w-8 flex-shrink-0">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  callerPrincipal: string;
}

function MessageBubble({ msg, isOwn, callerPrincipal }: MessageBubbleProps) {
  const senderId = getSenderId(msg);
  const fallbackName = getSenderName(msg);
  const { data: profile } = useGetUserProfile(senderId);
  const displayName = profile?.displayName || fallbackName || 'User';

  const time = new Date(Number(msg.createdAt) / 1_000_000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-2 items-start ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <MessageAvatar principalStr={senderId} fallbackName={fallbackName} />
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2 mb-1">
          {!isOwn && (
            <span className="text-xs font-semibold text-foreground">{displayName}</span>
          )}
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <div
          className={`rounded-2xl px-3 py-2 text-sm break-words ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          }`}
        >
          {msg.text && <p>{msg.text}</p>}
          {msg.fileUrl && (
            <div className="mt-1">
              {msg.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileName) ? (
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName}
                  className="max-w-xs rounded-lg mt-1"
                />
              ) : (
                <a
                  href={msg.fileUrl}
                  download={msg.fileName}
                  className="flex items-center gap-1 underline text-xs opacity-80 hover:opacity-100"
                >
                  <FileText className="h-3 w-3" />
                  <Download className="h-3 w-3" />
                  {msg.fileName || 'Download file'}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateSeparator(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

interface MessageFeedProps {
  messages: Message[];
  callerPrincipal: string;
}

export default function MessageFeed({ messages, callerPrincipal }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  const grouped: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const dateStr = formatDateSeparator(msg.createdAt);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      grouped.push({ date: dateStr, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {grouped.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">{group.date}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3">
            {group.messages.map((msg) => (
              <MessageBubble
                key={msg.id.toString()}
                msg={msg}
                isOwn={getSenderId(msg) === callerPrincipal}
                callerPrincipal={callerPrincipal}
              />
            ))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
