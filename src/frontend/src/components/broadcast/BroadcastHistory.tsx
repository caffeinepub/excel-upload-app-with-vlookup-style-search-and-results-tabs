import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Megaphone, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { BroadcastMessage } from "../../backend";
import { useDismissBroadcast } from "../../hooks/useBroadcasts";

interface BroadcastHistoryProps {
  broadcasts: BroadcastMessage[];
}

const HIDDEN_BROADCASTS_KEY = "hiddenBroadcastIds";

function getHiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_BROADCASTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function addHiddenId(id: string) {
  try {
    const set = getHiddenIds();
    set.add(id);
    localStorage.setItem(HIDDEN_BROADCASTS_KEY, JSON.stringify([...set]));
  } catch {}
}

function formatTime(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function BroadcastHistory({
  broadcasts,
}: BroadcastHistoryProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(getHiddenIds);
  const dismiss = useDismissBroadcast();

  const sorted = [...broadcasts]
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .filter((b) => !hiddenIds.has(b.id.toString()));

  const handleDelete = (id: bigint) => {
    const idStr = id.toString();
    addHiddenId(idStr);
    setHiddenIds((prev) => new Set([...prev, idStr]));
    // also call dismiss on the backend (best-effort)
    dismiss.mutate(id, {
      onError: () => {},
    });
    toast.success("Broadcast removed");
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Broadcast History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p
            className="text-xs text-muted-foreground text-center py-4"
            data-ocid="broadcast-history.empty_state"
          >
            No broadcasts yet.
          </p>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {sorted.map((msg) => (
                <div
                  key={msg.id.toString()}
                  className="group rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2"
                  data-ocid="broadcast-history.item"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{msg.text}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={() => handleDelete(msg.id)}
                    title="Delete broadcast"
                    data-ocid="broadcast-history.delete_button"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
