import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useUserProfile';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, User } from 'lucide-react';

export function UserProfileSetup() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const saveProfileMutation = useSaveCallerUserProfile();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      await saveProfileMutation.mutateAsync({ name: name.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!showProfileSetup) {
      setName('');
      setError(null);
    }
  }, [showProfileSetup]);

  return (
    <Dialog open={showProfileSetup} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Welcome! Set Up Your Profile
          </DialogTitle>
          <DialogDescription>
            Please enter your name to complete your profile setup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="profile-name">Your Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={saveProfileMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSave();
                }
              }}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saveProfileMutation.isPending || !name.trim()}
            className="w-full"
          >
            {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
