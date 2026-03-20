import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  useDeleteChannelMessage,
  useGetChannelMessages,
  useListChannels,
} from "../../hooks/useTeamMessaging";

const LAST_SEEN_KEY = "teamMessagesLastSeen";

function getLastSeen(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function markAllSeen() {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {}
}

function timeAgo(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface TeamMessagesWidgetProps {
  onNavigate?: (tab: string) => void;
}

export default function TeamMessagesWidget({
  onNavigate,
}: TeamMessagesWidgetProps = {}) {
  const { data: channels = [] } = useListChannels();
  const [lastSeen, setLastSeen] = useState(getLastSeen);
  const [dismissed, setDismissed] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const deleteMsg = useDeleteChannelMessage();

  const ch1 = useGetChannelMessages(channels[0]?.id ?? null);
  const ch2 = useGetChannelMessages(channels[1]?.id ?? null);
  const ch3 = useGetChannelMessages(channels[2]?.id ?? null);

  const allMessages = [
    ...(ch1.data ?? []).map((m) => ({
      ...m,
      channelName: channels[0]?.name ?? "",
      channelId: channels[0]?.id ?? (null as bigint | null),
    })),
    ...(ch2.data ?? []).map((m) => ({
      ...m,
      channelName: channels[1]?.name ?? "",
      channelId: channels[1]?.id ?? (null as bigint | null),
    })),
    ...(ch3.data ?? []).map((m) => ({
      ...m,
      channelName: channels[2]?.name ?? "",
      channelId: channels[2]?.id ?? (null as bigint | null),
    })),
  ]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .filter((m) => !deletedIds.has(m.id.toString()))
    .slice(0, 5);

  const newCount = allMessages.filter(
    (m) => Number(m.createdAt) / 1_000_000 > lastSeen,
  ).length;

  const handleMarkSeen = () => {
    markAllSeen();
    setLastSeen(Date.now());
  };

  const handleMessageClick = (channelId: bigint | null) => {
    markAllSeen();
    setLastSeen(Date.now());
    if (channelId !== null) {
      localStorage.setItem("pendingTeamChannel", String(channelId));
    }
    onNavigate?.("team");
  };

  const handleDeleteMessage = (
    e: React.MouseEvent,
    msgId: bigint,
    channelId: bigint | null,
  ) => {
    e.stopPropagation();
    const idStr = msgId.toString();
    setDeletedIds((prev) => new Set([...prev, idStr]));
    if (channelId !== null) {
      deleteMsg.mutate({ channelId, messageId: msgId });
    }
  };

  if (dismissed || allMessages.length === 0) return null;

  return (
    <Card data-ocid="dashboard.team-messages.panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="relative">
            <MessageSquare className="h-4 w-4 text-primary" />
            {newCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </div>
          Recent Team Messages
          {newCount > 0 ? (
            <Badge variant="destructive" className="ml-auto text-xs">
              {newCount} new
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto text-xs">
              {allMessages.length}
            </Badge>
          )}
          {newCount > 0 && (
            <button
              type="button"
              onClick={handleMarkSeen}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Mark all as seen"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {allMessages.map((msg) => {
          const isNew = Number(msg.createdAt) / 1_000_000 > lastSeen;
          return (
            <div
              key={msg.id.toString()}
              className={`group flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0 rounded-md ${
                isNew ? "bg-primary/5 px-2 -mx-2" : ""
              }`}
              data-ocid="dashboard.team-message.row"
            >
              <button
                type="button"
                className="flex items-start gap-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors text-left min-w-0"
                onClick={() => handleMessageClick(msg.channelId)}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(msg.senderName || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {msg.senderName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      #{msg.channelName}
                    </Badge>
                    {isNew && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1 py-0"
                      >
                        new
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(msg.text || "").slice(0, 80)}
                    {(msg.text || "").length > 80 ? "\u2026" : ""}
                  </p>
                </div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity self-center"
                onClick={(e) => handleDeleteMessage(e, msg.id, msg.channelId)}
                title="Delete message"
                data-ocid="dashboard.team-message.delete_button"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Hook to get unread team message count for sidebar badge */
export function useTeamUnreadCount(): number {
  const { data: channels = [] } = useListChannels();
  const ch1 = useGetChannelMessages(channels[0]?.id ?? null);
  const ch2 = useGetChannelMessages(channels[1]?.id ?? null);
  const ch3 = useGetChannelMessages(channels[2]?.id ?? null);

  const lastSeen = getLastSeen();

  const allMessages = [
    ...(ch1.data ?? []),
    ...(ch2.data ?? []),
    ...(ch3.data ?? []),
  ];

  return allMessages.filter((m) => Number(m.createdAt) / 1_000_000 > lastSeen)
    .length;
}
