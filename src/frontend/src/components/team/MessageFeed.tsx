import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDown,
  Download,
  FileText,
  Pencil,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { ChannelMessage, DirectMessage } from "../../backend";
import { useAllUsersPublic } from "../../hooks/useAllUsersPublic";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { useGetUserProfile } from "../../hooks/useUserProfile";
import { getInitials } from "../../lib/avatarUtils";
import { getDmSeenBy, markDmMessagesSeen } from "../../lib/team/dmSeen";
import { getSeenBy } from "../../lib/team/seenMessages";
import type { ReplyContext } from "./MessageInput";
import MessageInput from "./MessageInput";

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

const QUICK_EMOJIS = [
  "\uD83D\uDC4D",
  "\u2764\uFE0F",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDC4F",
  "\uD83D\uDD25",
  "\uD83C\uDF89",
  "\uD83D\uDE4C",
  "\u2705",
];

interface MessageAvatarProps {
  principalStr: string;
  fallbackName: string;
  size?: "sm" | "md";
}

function MessageAvatar({
  principalStr,
  fallbackName,
  size = "sm",
}: MessageAvatarProps) {
  const { data: profile } = useGetUserProfile(principalStr);
  const avatarUrl = useAvatarUrl(profile?.profilePicture ?? null);
  const initials = getInitials(profile?.displayName || fallbackName);
  const displayName = profile?.displayName || fallbackName;
  const sizeClass = size === "md" ? "h-9 w-9" : "h-8 w-8";

  return (
    <Avatar
      className={`${sizeClass} flex-shrink-0 ring-2 ring-white shadow-sm`}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
      <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

interface ReactionCounts {
  [emoji: string]: number;
}

function getReactionKey(
  msg: Message,
  channelId?: string,
  otherPrincipal?: string,
): string {
  if (isChannelMessage(msg) && channelId) {
    return `msgReactions_${channelId}_${msg.id.toString()}`;
  }
  if (!isChannelMessage(msg) && otherPrincipal) {
    const from = msg.fromPrincipal.toString();
    const to = msg.toPrincipal.toString();
    const convKey = [from, to].sort().join("__");
    return `msgReactions_dm_${convKey}_${msg.id.toString()}`;
  }
  return `msgReactions_fallback_${msg.id.toString()}`;
}

function loadReactionsFromStorage(key: string): {
  counts: ReactionCounts;
  myReactions: string[];
} {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { counts: {}, myReactions: [] };
}

function saveReactionsToStorage(
  key: string,
  counts: ReactionCounts,
  myReactions: Set<string>,
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ counts, myReactions: Array.from(myReactions) }),
    );
  } catch {
    // ignore
  }
}

function formatFullTimestamp(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  isAdmin: boolean;
  callerPrincipal: string;
  otherPrincipal?: string;
  onDeleteMessage?: (messageId: bigint) => void;
  onEditMessage?: (messageId: bigint, newText: string) => void;
  onReply?: (context: ReplyContext) => void;
  markerIndex: number;
  isGroupStart: boolean;
  channelId?: string;
  userMap: Map<string, string>;
  backendSeenByMap?: Map<string, string[]>;
  globalReactions?: Map<string, number>;
  myGlobalReactions?: Set<string>;
  onReact?: (msgId: bigint, emoji: string, add: boolean) => Promise<void>;
}

function MessageBubble({
  msg,
  isOwn,
  isAdmin,
  callerPrincipal,
  otherPrincipal,
  onDeleteMessage,
  onEditMessage,
  onReply,
  markerIndex,
  isGroupStart,
  channelId,
  userMap,
  backendSeenByMap,
  globalReactions,
  myGlobalReactions,
  onReact,
}: MessageBubbleProps) {
  const reactionKey = getReactionKey(msg, channelId, otherPrincipal);

  const [localReactions, setLocalReactions] = useState<ReactionCounts>(
    () => loadReactionsFromStorage(reactionKey).counts,
  );
  const [localMyReactions, setLocalMyReactions] = useState<Set<string>>(
    () => new Set(loadReactionsFromStorage(reactionKey).myReactions),
  );

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const senderId = getSenderId(msg);
  const fallbackName = getSenderName(msg);
  const { data: profile } = useGetUserProfile(senderId);
  const displayName = profile?.displayName || fallbackName || "User";

  const time = new Date(Number(msg.createdAt) / 1_000_000).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const canDelete = isOwn || isAdmin;
  const canEdit = isOwn;

  // Check if message was edited
  const isEdited =
    msg.text !== null &&
    msg.text !== undefined &&
    (msg as { isEdited?: boolean }).isEdited === true;

  // Parse reply prefix from text
  const hasReplyPrefix = msg.text?.startsWith("> ");
  let replyLine = "";
  let mainText = msg.text || "";
  if (hasReplyPrefix && msg.text) {
    const lines = msg.text.split("\n");
    replyLine = lines[0].replace(/^> /, "");
    mainText = lines.slice(1).join("\n");
  }

  // Seen indicators
  const channelSeenByPrincipals =
    channelId && isChannelMessage(msg)
      ? getSeenBy(channelId, msg.id.toString()).filter(
          (p) => p !== callerPrincipal,
        )
      : [];
  const channelSeenByLocalNames = channelSeenByPrincipals.map(
    (p) => userMap.get(p) || `${p.slice(0, 8)}…`,
  );
  const backendSeenNames =
    isChannelMessage(msg) && backendSeenByMap
      ? (backendSeenByMap.get(msg.id.toString()) ?? []).filter(
          (n) => n !== "" && !channelSeenByLocalNames.includes(n),
        )
      : [];
  const allChannelSeenNames = [
    ...new Set([...channelSeenByLocalNames, ...backendSeenNames]),
  ];

  const dmSeenBy =
    !isChannelMessage(msg) && otherPrincipal
      ? getDmSeenBy(otherPrincipal, callerPrincipal, msg.id.toString()).filter(
          (p) => p !== callerPrincipal,
        )
      : [];

  // Merge global reactions with local reactions
  const mergedReactions: ReactionCounts = { ...localReactions };
  if (globalReactions) {
    for (const [emoji, count] of globalReactions) {
      mergedReactions[emoji] = count;
    }
  }
  const effectiveMyReactions = myGlobalReactions ?? localMyReactions;

  const handleEmojiSelect = async (emoji: string) => {
    setShowEmojiPicker(false);
    const isReacted = effectiveMyReactions.has(emoji);
    // Optimistic local update
    setLocalReactions((prev) => {
      const current = prev[emoji] ?? 0;
      const newCounts: ReactionCounts = {
        ...prev,
        [emoji]: isReacted ? Math.max(0, current - 1) : current + 1,
      };
      const newMyReactions = new Set(localMyReactions);
      if (isReacted) newMyReactions.delete(emoji);
      else newMyReactions.add(emoji);
      setLocalMyReactions(newMyReactions);
      saveReactionsToStorage(reactionKey, newCounts, newMyReactions);
      return newCounts;
    });
    // Also post to backend
    if (onReact) {
      try {
        await onReact(msg.id, emoji, !isReacted);
      } catch {
        // ignore backend errors, local state is already updated
      }
    }
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

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  const activeReactions = Object.entries(mergedReactions).filter(
    ([, count]) => count > 0,
  );

  return (
    <div
      className={`flex gap-2.5 items-end group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 ${isGroupStart ? "" : "opacity-0 pointer-events-none"}`}
      >
        <MessageAvatar
          principalStr={senderId}
          fallbackName={fallbackName}
          size="sm"
        />
      </div>

      <div
        className={`flex flex-col max-w-[72%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}
      >
        {/* Sender name + time */}
        {isGroupStart && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1.5 pl-1">
            <span className="text-xs font-bold text-gray-800 tracking-tight">
              {displayName}
            </span>
            <div className="relative">
              <span
                className="text-[10px] text-gray-400 cursor-default"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {time}
              </span>
              {showTooltip && (
                <div className="absolute bottom-full left-0 mb-1 whitespace-nowrap bg-gray-800 text-white text-[10px] rounded px-2 py-1 shadow-lg z-20">
                  {formatFullTimestamp(msg.createdAt)}
                </div>
              )}
            </div>
          </div>
        )}
        {isGroupStart && isOwn && (
          <div className="flex items-baseline gap-2 mb-1.5 justify-end pr-1">
            <div className="relative">
              <span
                className="text-[10px] text-gray-400 cursor-default"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {time}
              </span>
              {showTooltip && (
                <div className="absolute bottom-full right-0 mb-1 whitespace-nowrap bg-gray-800 text-white text-[10px] rounded px-2 py-1 shadow-lg z-20">
                  {formatFullTimestamp(msg.createdAt)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit mode */}
        {isEditing ? (
          <div className="w-full space-y-1.5">
            <Textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="text-sm resize-none min-h-[60px] rounded-2xl border-indigo-200 focus:ring-indigo-200"
              rows={2}
            />
            <div className="flex items-center gap-1.5 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(msg.text || "");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleEditSave}
                disabled={isSavingEdit || !editText.trim()}
              >
                Save
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">
              Enter to save · Esc to cancel
            </p>
          </div>
        ) : (
          <>
            {/* Reply preview */}
            {hasReplyPrefix && replyLine && (
              <div
                className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 border-indigo-400 bg-indigo-50/70 text-xs text-gray-500 max-w-full truncate ${
                  isOwn ? "self-end" : ""
                }`}
              >
                <span className="font-medium text-indigo-600 mr-1.5">
                  {replyLine.split(":")[0]}:
                </span>
                <span>{replyLine.split(":").slice(1).join(":").trim()}</span>
              </div>
            )}

            {/* Bubble */}
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm break-words leading-relaxed shadow-sm ${
                isOwn
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-[4px]"
                  : "bg-white border border-gray-100 text-gray-800 rounded-tl-[4px]"
              }`}
            >
              {mainText && <p className="whitespace-pre-wrap">{mainText}</p>}
              {msg.fileUrl && (
                <div className="mt-1.5">
                  {msg.fileName &&
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileName) ? (
                    <img
                      src={msg.fileUrl}
                      alt={msg.fileName}
                      className="max-w-xs rounded-xl mt-1 border border-white/10"
                    />
                  ) : (
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      className="flex items-center gap-1.5 underline text-xs opacity-75 hover:opacity-100 mt-1"
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
              {!isGroupStart && (
                <span className="text-[10px] opacity-30 ml-2 float-right mt-0.5">
                  {time}
                </span>
              )}
              {isEdited && (
                <span
                  className={`text-[10px] ml-2 italic ${
                    isOwn ? "text-white/50" : "text-gray-400"
                  }`}
                >
                  edited
                </span>
              )}
            </div>

            {/* Reactions — always visible when non-empty */}
            {activeReactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {activeReactions.map(([emoji, count]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 border transition-all ${
                      effectiveMyReactions.has(emoji)
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="font-semibold">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action bar — visible on hover via group */}
            <div
              className={`flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                isOwn ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Reply */}
              {onReply && (
                <button
                  type="button"
                  onClick={() =>
                    onReply({
                      senderName: displayName,
                      text: mainText || msg.text || "",
                    })
                  }
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded-lg hover:bg-indigo-50 text-xs"
                  title="Reply"
                  data-ocid={`team.message.reply_button.${markerIndex}`}
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Emoji reaction */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="text-gray-400 hover:text-amber-500 transition-colors p-1 rounded-lg hover:bg-amber-50 text-xs"
                  title="React"
                  data-ocid={`team.message.react_button.${markerIndex}`}
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {showEmojiPicker && (
                  <div
                    className={`absolute bottom-full mb-1.5 z-20 flex items-center gap-0.5 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-xl ${
                      isOwn ? "right-0" : "left-0"
                    }`}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-lg hover:scale-130 transition-transform px-0.5 leading-none hover:bg-gray-100 rounded"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {canEdit && onEditMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(msg.text || "");
                  }}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded-lg hover:bg-indigo-50"
                  title="Edit message"
                  data-ocid={`team.message.edit_button.${markerIndex}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              {canDelete && onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this message?")) {
                      onDeleteMessage(msg.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                  title="Delete message"
                  data-ocid={`team.message.delete_button.${markerIndex}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Seen / Sent indicator — always show for own messages */}
            {isOwn && (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                {isChannelMessage(msg) && allChannelSeenNames.length > 0 && (
                  <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-0.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2 12l5 5L20 4"
                      />
                    </svg>
                    <svg
                      className="h-3.5 w-3.5 -ml-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l5 5L20 4"
                      />
                    </svg>
                    Seen by{" "}
                    {allChannelSeenNames.length <= 3
                      ? allChannelSeenNames.join(", ")
                      : `${allChannelSeenNames.slice(0, 3).join(", ")} +${allChannelSeenNames.length - 3} more`}
                  </span>
                )}
                {isChannelMessage(msg) && allChannelSeenNames.length === 0 && (
                  <span className="text-[10px] text-gray-300 flex items-center gap-0.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12l5 5L20 6"
                      />
                    </svg>
                    Sent
                  </span>
                )}
                {!isChannelMessage(msg) && dmSeenBy.length > 0 && (
                  <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-0.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2 12l5 5L20 4"
                      />
                    </svg>
                    <svg
                      className="h-3.5 w-3.5 -ml-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l5 5L20 4"
                      />
                    </svg>
                    Seen
                  </span>
                )}
                {!isChannelMessage(msg) && dmSeenBy.length === 0 && (
                  <span className="text-[10px] text-gray-300 flex items-center gap-0.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12l5 5L20 6"
                      />
                    </svg>
                    Sent
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
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
  channelId?: string;
  otherPrincipal?: string;
  backendSeenByMap?: Map<string, string[]>;
  searchQuery?: string;
  onSendReply?: (
    text: string,
    fileUrl?: string,
    fileName?: string,
  ) => Promise<void>;
  onReact?: (msgId: bigint, emoji: string, add: boolean) => Promise<void>;
  callerDisplayName?: string;
}

export default function MessageFeed({
  messages,
  callerPrincipal,
  isAdmin = false,
  onDeleteMessage,
  onEditMessage,
  channelId,
  otherPrincipal,
  backendSeenByMap,
  searchQuery = "",
  onReact,
  callerDisplayName,
}: MessageFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);
  const userMap = useAllUsersPublic();

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length triggers scroll-to-bottom
  useEffect(() => {
    if (!showJumpToBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!otherPrincipal || !callerPrincipal || messages.length === 0) return;
    const ids = messages.map((m) => m.id.toString());
    markDmMessagesSeen(otherPrincipal, callerPrincipal, ids);
  }, [messages, otherPrincipal, callerPrincipal]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowJumpToBottom(scrollHeight - scrollTop - clientHeight > 200);
  };

  // Filter out all special system messages
  const visibleMessages = messages.filter(
    (m) =>
      !m.text?.startsWith("__seen:") &&
      !m.text?.startsWith("__react:") &&
      !m.text?.startsWith("__unreact:"),
  );

  const specialMessages = messages.filter(
    (m) =>
      m.text?.startsWith("__seen:") ||
      m.text?.startsWith("__react:") ||
      m.text?.startsWith("__unreact:"),
  );

  // Build seen-by map from __seen: receipts
  const seenReceipts = specialMessages.filter((m) =>
    m.text?.startsWith("__seen:"),
  );
  const computedBackendSeenByMap = new Map<string, string[]>();
  for (const r of seenReceipts) {
    // Support both old format "__seen:msgId" and new format "__seen:msgId:principal"
    const raw = (r.text ?? "").replace("__seen:", "");
    const parts = raw.split(":");
    const msgId = parts[0] ?? "";
    const viewerPrincipal = parts[1] ?? "";
    // Prefer senderName (set at post time with correct display name),
    // fall back to userMap lookup, then truncated principal
    const nameFromSender = isChannelMessage(r) ? r.senderName : "";
    const nameFromMap = viewerPrincipal
      ? userMap.get(viewerPrincipal) || ""
      : "";
    const name =
      nameFromSender ||
      nameFromMap ||
      (viewerPrincipal ? `${viewerPrincipal.slice(0, 8)}…` : "");
    if (name && msgId) {
      const existing = computedBackendSeenByMap.get(msgId) ?? [];
      if (!existing.includes(name)) {
        computedBackendSeenByMap.set(msgId, [...existing, name]);
      }
    }
  }
  const effectiveBackendSeenByMap =
    backendSeenByMap ?? computedBackendSeenByMap;

  // Build global reaction counts from __react: / __unreact: messages
  // Track: msgId -> emoji -> senderName -> lastAction (react | unreact)
  const reactEventMap = new Map<string, Map<string, Map<string, string>>>();
  for (const r of specialMessages) {
    if (!r.text) continue;
    const isReact = r.text.startsWith("__react:");
    const isUnreact = r.text.startsWith("__unreact:");
    if (!isReact && !isUnreact) continue;
    const prefix = isReact ? "__react:" : "__unreact:";
    const parts = r.text.slice(prefix.length).split(":");
    if (parts.length < 3) continue;
    const [msgId, emoji, ...nameParts] = parts;
    const senderName = nameParts.join(":");
    if (!msgId || !emoji || !senderName) continue;
    if (!reactEventMap.has(msgId)) reactEventMap.set(msgId, new Map());
    const emojiMap = reactEventMap.get(msgId)!;
    if (!emojiMap.has(emoji)) emojiMap.set(emoji, new Map());
    emojiMap.get(emoji)!.set(senderName, isReact ? "react" : "unreact");
  }

  // Build globalReactionCountsMap: msgId -> emoji -> count
  const globalReactionCountsMap = new Map<string, Map<string, number>>();
  for (const [msgId, emojiMap] of reactEventMap) {
    const countMap = new Map<string, number>();
    for (const [emoji, userActions] of emojiMap) {
      let count = 0;
      for (const action of userActions.values()) {
        if (action === "react") count++;
      }
      if (count > 0) countMap.set(emoji, count);
    }
    if (countMap.size > 0) globalReactionCountsMap.set(msgId, countMap);
  }

  // Build myGlobalReactionsMap: msgId -> set of emojis caller reacted to
  const myGlobalReactionsMap = new Map<string, Set<string>>();
  if (callerDisplayName) {
    for (const [msgId, emojiMap] of reactEventMap) {
      const myEmojis = new Set<string>();
      for (const [emoji, userActions] of emojiMap) {
        const myAction = userActions.get(callerDisplayName);
        if (myAction === "react") myEmojis.add(emoji);
      }
      if (myEmojis.size > 0) myGlobalReactionsMap.set(msgId, myEmojis);
    }
  }

  // Apply search filter
  const filteredMessages = searchQuery.trim()
    ? visibleMessages.filter((m) =>
        m.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleMessages;

  if (filteredMessages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16"
        data-ocid="team.messages.empty_state"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center">
          <span className="text-4xl">💬</span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700">
            {searchQuery ? "No messages match your search" : "No messages yet"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {searchQuery
              ? "Try a different keyword"
              : "Be the first to say something!"}
          </p>
        </div>
      </div>
    );
  }

  const grouped: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of filteredMessages) {
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
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-semibold px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-1">
              {group.messages.map((msg, idx) => {
                msgIndex += 1;
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isGroupStart = !prevMsg || !isSameGroup(prevMsg, msg);
                const msgIdStr = msg.id.toString();

                return (
                  <div
                    key={msgIdStr}
                    className={isGroupStart ? "pt-3" : "pt-0.5"}
                  >
                    <MessageBubble
                      msg={msg}
                      isOwn={getSenderId(msg) === callerPrincipal}
                      isAdmin={isAdmin}
                      callerPrincipal={callerPrincipal}
                      otherPrincipal={otherPrincipal}
                      onDeleteMessage={onDeleteMessage}
                      onEditMessage={onEditMessage}
                      onReply={setReplyContext}
                      markerIndex={msgIndex}
                      isGroupStart={isGroupStart}
                      channelId={channelId}
                      userMap={userMap}
                      backendSeenByMap={effectiveBackendSeenByMap}
                      globalReactions={globalReactionCountsMap.get(msgIdStr)}
                      myGlobalReactions={myGlobalReactionsMap.get(msgIdStr)}
                      onReact={onReact}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Jump to bottom button */}
      {showJumpToBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-indigo-600 text-white rounded-full p-2.5 shadow-lg hover:bg-indigo-700 transition-all z-10 flex items-center gap-1.5"
          data-ocid="team.jump_to_bottom.button"
          style={{ animation: "fadeIn 0.2s ease" }}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Reply context above input */}
      {replyContext && (
        <div className="px-4 pb-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-indigo-50 border border-b-0 border-indigo-100 text-xs">
            <span className="text-indigo-500">↩ Replying to</span>
            <span className="font-semibold text-indigo-700">
              {replyContext.senderName}
            </span>
            <span className="text-gray-500 truncate flex-1">
              {replyContext.text.slice(0, 60)}
            </span>
            <button
              type="button"
              onClick={() => setReplyContext(null)}
              className="text-gray-400 hover:text-gray-700 ml-auto flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style>
        {
          "@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }"
        }
      </style>
    </div>
  );

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpToBottom(false);
  }
}
