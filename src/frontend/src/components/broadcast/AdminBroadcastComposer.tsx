import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Send } from "lucide-react";
import React, { useState } from "react";
import { useCreateBroadcast } from "../../hooks/useBroadcasts";

const MAX_CHARS = 500;

export default function AdminBroadcastComposer() {
  const [text, setText] = useState("");
  const createBroadcast = useCreateBroadcast();

  const handleSend = async () => {
    if (!text.trim()) return;
    await createBroadcast.mutateAsync(text.trim());
    setText("");
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Broadcast to All Users
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          placeholder="Type a message to broadcast to all users..."
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {text.length}/{MAX_CHARS}
          </span>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!text.trim() || createBroadcast.isPending}
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            {createBroadcast.isPending ? "Sending..." : "Send Broadcast"}
          </Button>
        </div>
        {createBroadcast.isError && (
          <p className="text-xs text-destructive">
            Failed to send broadcast. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
