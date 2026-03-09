import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { ChannelMessage, DirectMessage } from "../../backend";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { useGetUserProfile } from "../../hooks/useUserProfile";
import { getInitials } from "../../lib/avatarUtils";

type Message = ChannelMessage | DirectMessage;

function isChannelMessage(msg: Message): msg is ChannelMessage {
  return "channelId" in msg;
}

function getSenderId(msg: Message): string {
  if (isChannelMessage(msg)) return msg.senderId.toString();
  return msg.fromPrincipal.toString();
}

function getSenderName(msg: Message): string {
  if (isChannelMessage(msg)) return msg.senderName;
  return "";
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

interface MessageAvatarProps {
  principalStr: string;
  fallbackName: string;
  size?: "sm" | "md";
}

function MessageAvatar({
  principalStr,
  fallbackName,
  size = "md",
}: MessageAvatarProps) {
  const { data: profile } = useGetUserProfile(principalStr);
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName || fallbackName);
  const displayName = profile?.displayName || fallbackName;
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <Avatar className={`${sizeClass} flex-shrink-0`}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
      <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div className="flex items-center gap-0.5 bg-popover border border-border rounded-full px-1.5 py-0.5 shadow-md">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-sm hover:scale-125 transition-transform px-0.5 leading-none"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface ReactionCounts {
  [emoji: string]: number;
}

interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  isAdmin: boolean;
  callerPrincipal: string;
  onDeleteMessage?: (messageId: bigint) => void;
  onEditMessage?: (messageId: bigint, newText: string) => void;
  markerIndex: number;
  /** Whether this message is the first in a group (shows avatar + name) */
  isGroupStart: boolean;
}

function MessageBubble({
  msg,
  isOwn,
  isAdmin,
  onDeleteMessage,
  onEditMessage,
  markerIndex,
  isGroupStart,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const senderId = getSenderId(msg);
  const fallbackName = getSenderName(msg);
  const { data: profile } = useGetUserProfile(senderId);
  const displayName = profile?.displayName || fallbackName || "User";

  const time = new Date(Number(msg.createdAt) / 1_000_000).toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" },
  );

  const canDelete = isOwn || isAdmin;
  const canEdit = isOwn;

  const handleEmojiSelect = (emoji: string) => {
    setShowEmojiPicker(false);
    setReactions((prev) => {
      const current = prev[emoji] ?? 0;
      if (myReactions.has(emoji)) {
        // Remove reaction
        setMyReactions((s) => {
          const n = new Set(s);
          n.delete(emoji);
          return n;
        });
        return { ...prev, [emoji]: Math.max(0, current - 1) };
      }
      // Add reaction
      setMyReactions((s) => new Set(s).add(emoji));
      return { ...prev, [emoji]: current + 1 };
    });
  };

  const toggleReaction = (emoji: string) => {
    handleEmojiSelect(emoji);
  };

  const handleEditSave = async () => {
    if (!editText.trim() || !onEditMessage) return;
    setIsSavingEdit(true);
    try {
      await onEditMessage(msg.id, editText.trim());
      setIsEditing(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(msg.text || "");
    }
  };

  // Focus edit textarea when edit mode starts
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  const activeReactions = Object.entries(reactions).filter(
    ([, count]) => count > 0,
  );

  return (
    <div
      className={`flex gap-2.5 items-start group relative ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar — only shown for group start; spacer otherwise */}
      {isGroupStart ? (
        <MessageAvatar principalStr={senderId} fallbackName={fallbackName} />
      ) : (
        <div className={`${isOwn ? "" : "w-8"} flex-shrink-0`} />
      )}

      <div
        className={`flex flex-col max-w-[72%] ${isOwn ? "items-end" : "items-start"} relative`}
      >
        {/* Sender info — only on group start */}
        {isGroupStart && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground/90 tracking-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-muted-foreground/70">{time}</span>
          </div>
        )}
        {isGroupStart && isOwn && (
          <div className="flex items-baseline gap-2 mb-1 justify-end">
            <span className="text-[10px] text-muted-foreground/70">{time}</span>
          </div>
        )}

        {/* Message bubble */}
        {isEditing ? (
          <div className="w-full space-y-1.5">
            <Textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="text-sm resize-none min-h-[60px] rounded-xl"
              rows={2}
            />
            <div className="flex items-center gap-1.5 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(msg.text || "");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleEditSave}
                disabled={isSavingEdit || !editText.trim()}
              >
                Save
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Press Enter to save · Esc to cancel
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm relative ${
              isOwn
                ? "bg-primary text-primary-foreground rounded-tr-[4px]"
                : "bg-card border border-border/40 text-foreground rounded-tl-[4px]"
            }`}
          >
            {msg.text && (
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            )}
            {msg.fileUrl && (
              <div className="mt-1.5">
                {msg.fileName &&
                /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileName) ? (
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName}
                    className="max-w-xs rounded-lg mt-1 border border-white/10"
                  />
                ) : (
                  <a
                    href={msg.fileUrl}
                    download={msg.fileName}
                    className="flex items-center gap-1.5 underline text-xs opacity-80 hover:opacity-100 mt-1"
                  >
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <Download className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {msg.fileName || "Download file"}
                    </span>
                  </a>
                )}
              </div>
            )}
            {/* Show time inline if not group start */}
            {!isGroupStart && (
              <span className="text-[10px] opacity-50 ml-2 float-right mt-0.5">
                {time}
              </span>
            )}
          </div>
        )}

        {/* Reactions row */}
        {activeReactions.length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-1 mt-1">
            {activeReactions.map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                className={`flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors ${
                  myReactions.has(emoji)
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-muted border-border hover:bg-accent"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons — visible on hover (desktop) or always for own messages on touch */}
      {!isEditing && (canEdit || canDelete) && (
        <div
          className={`absolute top-0 flex items-center gap-0.5 z-10 transition-opacity ${
            hovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } ${isOwn ? "right-full mr-2" : "left-full ml-2"}`}
        >
          {showEmojiPicker ? (
            <EmojiPicker onSelect={handleEmojiSelect} />
          ) : (
            <div className="flex items-center gap-0.5 bg-popover border border-border rounded-full px-1.5 py-0.5 shadow-md">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title="React with emoji"
              >
                😊
              </button>
              {canEdit && onEditMessage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(msg.text || "");
                  }}
                  data-ocid={`team.message.edit_button.${markerIndex}`}
                  title="Edit message"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {canDelete && onDeleteMessage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={() => {
                    if (confirm("Delete this message?")) {
                      onDeleteMessage(msg.id);
                    }
                  }}
                  data-ocid={`team.message.delete_button.${markerIndex}`}
                  title="Delete message"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDateSeparator(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Returns true if two messages are from the same sender within 5 minutes */
function isSameGroup(a: Message, b: Message): boolean {
  if (getSenderId(a) !== getSenderId(b)) return false;
  const diff =
    Math.abs(Number(b.createdAt) - Number(a.createdAt)) / 1_000_000_000;
  return diff < 5 * 60;
}

export interface MessageFeedProps {
  messages: Message[];
  callerPrincipal: string;
  isAdmin?: boolean;
  onDeleteMessage?: (messageId: bigint) => void;
  onEditMessage?: (messageId: bigint, newText: string) => void;
}

export default function MessageFeed({
  messages,
  callerPrincipal,
  isAdmin = false,
  onDeleteMessage,
  onEditMessage,
}: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length triggers scroll-to-bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12"
        data-ocid="team.messages.empty_state"
      >
        <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
          <span className="text-2xl">💬</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/70">
            No messages yet
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const dateStr = formatDateSeparator(msg.createdAt);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      grouped.push({ date: dateStr, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  }

  let msgIndex = 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {grouped.map((group) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted/50 border border-border/40">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Messages in group */}
          <div className="space-y-0.5">
            {group.messages.map((msg, idx) => {
              msgIndex += 1;
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const isGroupStart = !prevMsg || !isSameGroup(prevMsg, msg);

              return (
                <div
                  key={msg.id.toString()}
                  className={isGroupStart ? "pt-2" : "pt-0.5"}
                >
                  <MessageBubble
                    msg={msg}
                    isOwn={getSenderId(msg) === callerPrincipal}
                    isAdmin={isAdmin}
                    callerPrincipal={callerPrincipal}
                    onDeleteMessage={onDeleteMessage}
                    onEditMessage={onEditMessage}
                    markerIndex={msgIndex}
                    isGroupStart={isGroupStart}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
