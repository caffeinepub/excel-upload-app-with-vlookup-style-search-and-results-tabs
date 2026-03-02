import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { getInitials } from '../../lib/avatarUtils';

interface ProfileEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileEditorDialog({ open, onOpenChange }: ProfileEditorDialogProps) {
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const [displayName, setDisplayName] = useState('');
  const [pictureBytes, setPictureBytes] = useState<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = useAvatarUrl(pictureBytes);

  // Populate form when profile loads or dialog opens
  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.displayName || '');
      if (profile.profilePicture && profile.profilePicture.length > 0) {
        setPictureBytes(new Uint8Array(profile.profilePicture));
      } else {
        setPictureBytes(null);
      }
    } else if (open && !profile) {
      setDisplayName('');
      setPictureBytes(null);
    }
  }, [open, profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    setPictureBytes(new Uint8Array(arrayBuffer));
  };

  const handleSave = async () => {
    await saveProfile.mutateAsync({
      displayName: displayName.trim() || 'User',
      profilePicture: pictureBytes ?? undefined,
    });
    onOpenChange(false);
  };

  const initials = getInitials(displayName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">Click the camera icon to change photo</p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={50}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveProfile.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveProfile.isPending || isLoading}>
            {saveProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
