import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallPlaceholderModalProps {
  open: boolean;
  onClose: () => void;
  type: 'voice' | 'video';
}

export default function CallPlaceholderModal({ open, onClose, type }: CallPlaceholderModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{type === 'voice' ? 'Voice Call' : 'Video Call'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-8 gap-4">
          <div
            className={`rounded-full p-6 ${
              type === 'voice' ? 'bg-green-500/10' : 'bg-blue-500/10'
            }`}
          >
            {type === 'voice' ? (
              <Phone className="h-10 w-10 text-green-500" />
            ) : (
              <Video className="h-10 w-10 text-blue-500" />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg mb-1">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              {type === 'voice' ? 'Voice calling' : 'Video calling'} will be available in a future
              update.
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
