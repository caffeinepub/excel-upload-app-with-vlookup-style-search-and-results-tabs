import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useActor } from "../../hooks/useActor";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { useSaveCallerUserProfile } from "../../hooks/useUserProfile";
import { getInitials } from "../../lib/avatarUtils";

interface UserProfileSetupProps {
  open: boolean;
}

export default function UserProfileSetup({ open }: UserProfileSetupProps) {
  const [displayName, setDisplayName] = useState("");
  const [pictureBytes, setPictureBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState("");
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [adminTokenError, setAdminTokenError] = useState("");
  const [adminTokenSuccess, setAdminTokenSuccess] = useState(false);
  const [isProcessingAdmin, setIsProcessingAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveProfile = useSaveCallerUserProfile();
  const avatarUrl = useAvatarUrl(pictureBytes);
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const initials = getInitials(displayName);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    setPictureBytes(new Uint8Array(arrayBuffer));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    setError("");

    // Try admin token first if provided
    if (adminSectionOpen && adminToken.trim() && actor) {
      setIsProcessingAdmin(true);
      setAdminTokenError("");
      try {
        // Cast to any since _initializeAccessControlWithSecret may not be in typed interface
        // but exists on the backend canister
        const actorAny = actor as unknown as Record<
          string,
          (token: string) => Promise<void>
        >;
        if (typeof actorAny._initializeAccessControlWithSecret === "function") {
          await actorAny._initializeAccessControlWithSecret(adminToken.trim());
        }
        setAdminTokenSuccess(true);
        await queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
        await queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
      } catch {
        setAdminTokenError(
          "Invalid admin token. You can still continue as a regular user.",
        );
      } finally {
        setIsProcessingAdmin(false);
      }
    }

    await saveProfile.mutateAsync({
      displayName: trimmed,
      profilePicture: pictureBytes ?? undefined,
    });
  };

  const isPending = saveProfile.isPending || isProcessingAdmin;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome! Set Up Your Profile</DialogTitle>
          <DialogDescription>
            Choose a display name and optionally add a profile photo to get
            started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Avatar picker */}
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
            <p className="text-xs text-muted-foreground">
              Optional: add a profile photo
            </p>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="setup-displayName">Display Name *</Label>
            <Input
              id="setup-displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Jane Smith"
              maxLength={50}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Admin Setup Section */}
          <div className="border border-amber-200 dark:border-amber-800/60 rounded-lg overflow-hidden bg-amber-50/50 dark:bg-amber-900/10">
            <button
              type="button"
              onClick={() => setAdminSectionOpen((prev) => !prev)}
              className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-800/20 transition-colors"
              data-ocid="setup.admin_section.toggle"
            >
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300 flex-1">
                Admin? Enter admin token here
              </span>
              {adminSectionOpen ? (
                <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </button>
            {adminSectionOpen && (
              <div className="px-3 pb-3 pt-2 space-y-2 border-t border-amber-200 dark:border-amber-800/60">
                <Label
                  htmlFor="setup-adminToken"
                  className="text-sm font-medium"
                >
                  Admin Token
                </Label>
                <Input
                  id="setup-adminToken"
                  type="password"
                  value={adminToken}
                  onChange={(e) => {
                    setAdminToken(e.target.value);
                    setAdminTokenError("");
                    setAdminTokenSuccess(false);
                  }}
                  placeholder="Enter admin token to gain admin access"
                  className="h-9"
                  data-ocid="setup.admin_token.input"
                />
                {adminTokenError && (
                  <div className="flex items-start gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive">
                      ✗ {adminTokenError}
                    </p>
                  </div>
                )}
                {adminTokenSuccess && (
                  <div className="flex items-start gap-1.5 p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      ✓ Admin access granted! You can now access the full app.
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Only the first user with the admin token can set up admin
                  access.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full"
              data-ocid="setup.submit_button"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
