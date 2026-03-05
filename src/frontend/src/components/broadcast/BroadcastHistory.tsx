import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Megaphone } from "lucide-react";
import React from "react";
import type { BroadcastMessage } from "../../backend";

interface BroadcastHistoryProps {
  broadcasts: BroadcastMessage[];
}

function formatTime(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function BroadcastHistory({
  broadcasts,
}: BroadcastHistoryProps) {
  if (broadcasts.length === 0) return null;

  const sorted = [...broadcasts].sort((a, b) =>
    Number(b.createdAt - a.createdAt),
  );

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Broadcast History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {sorted.map((msg) => (
              <div
                key={msg.id.toString()}
                className="rounded-lg border border-border bg-muted/40 p-3"
              >
                <p className="text-sm text-foreground">{msg.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
