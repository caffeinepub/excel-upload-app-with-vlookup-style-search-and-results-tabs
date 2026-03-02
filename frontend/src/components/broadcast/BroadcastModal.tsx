import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import { BroadcastMessage } from '../../backend';
import { useDismissBroadcast } from '../../hooks/useBroadcasts';

interface BroadcastModalProps {
  broadcast: BroadcastMessage;
  onDismissed: () => void;
}

function formatTime(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleString();
}

export default function BroadcastModal({ broadcast, onDismissed }: BroadcastModalProps) {
  const dismiss = useDismissBroadcast();

  const handleDismiss = async () => {
    await dismiss.mutateAsync(broadcast.id);
    onDismissed();
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Admin Broadcast
          </DialogTitle>
          <DialogDescription>
            {formatTime(broadcast.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-foreground text-base leading-relaxed">{broadcast.text}</p>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleDismiss}
            disabled={dismiss.isPending}
            className="min-w-[100px]"
          >
            {dismiss.isPending ? 'Dismissing...' : 'Dismiss'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
