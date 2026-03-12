import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Camera, Loader2, Save, User } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { setBirthdayForUser } from "../components/BirthdayPopup";
import { useListDepartments } from "../hooks/useDepartments";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useUserProfile";

export default function UserProfileTab() {
  const { identity } = useInternetIdentity();
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const { data: departments = [] } = useListDepartments();
  const saveMutation = useSaveCallerUserProfile();

  const principalStr = identity?.getPrincipal().toString() ?? "";

  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newPictureBytes, setNewPictureBytes] = useState<Uint8Array | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile into form state
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      if (profile.profilePicture && profile.profilePicture.length > 0) {
        const blob = new Blob([profile.profilePicture.buffer as ArrayBuffer], {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setAvatarPreview(url);
      }
    }
    // Load birthday from localStorage
    if (principalStr) {
      setBirthday(localStorage.getItem(`birthday_${principalStr}`) ?? "");
    }
  }, [profile, principalStr]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      setNewPictureBytes(bytes);
      setAvatarPreview(URL.createObjectURL(file));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        displayName: displayName.trim(),
        profilePicture: newPictureBytes ?? profile?.profilePicture,
        departmentId: profile?.departmentId,
      });

      // Save birthday to localStorage and update the birthday map
      if (principalStr) {
        localStorage.setItem(`birthday_${principalStr}`, birthday);
        if (birthday && /^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
          const mmdd = birthday.slice(5); // "MM-DD"
          setBirthdayForUser(principalStr, displayName.trim(), mmdd);
        } else {
          setBirthdayForUser(principalStr, displayName.trim(), "");
        }
      }

      toast.success("Profile saved successfully!");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  // Get department name(s) - primary
  const primaryDept = profile?.departmentId
    ? departments.find((d) => d.id === profile.departmentId)
    : null;

  // Extra depts from localStorage
  const extraDeptIds: string[] = (() => {
    try {
      const map = JSON.parse(
        localStorage.getItem("userExtraDepts") ?? "{}",
      ) as Record<string, string[]>;
      return map[principalStr] ?? [];
    } catch {
      return [];
    }
  })();

  const extraDepts = departments.filter((d) =>
    extraDeptIds.includes(String(d.id)),
  );

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-ocid="profile.loading_state"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your display name and profile picture
        </p>
      </div>

      {/* Avatar Section */}
      <Card data-ocid="profile.card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Click the avatar to upload a new photo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <button
            type="button"
            className="relative cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className="h-24 w-24 ring-2 ring-border">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <div className="space-y-1">
            <p className="text-sm font-medium">Upload a photo</p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF. Max 2MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 mt-1"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="profile.upload_button"
            >
              <Camera className="h-3.5 w-3.5" />
              Change Photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              data-ocid="profile.input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday">Date of Birth</Label>
            <Input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              data-ocid="profile.birthday_input"
            />
            <p className="text-xs text-muted-foreground">
              Used to celebrate your birthday with the team.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Department(s)
            </Label>
            {!primaryDept && extraDepts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Not assigned to any department yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {primaryDept && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {primaryDept.name}
                  </span>
                )}
                {extraDepts.map((d) => (
                  <span
                    key={String(d.id)}
                    className="text-sm px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border"
                  >
                    {d.name}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Department assignment is managed by your admin.
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <Label className="text-muted-foreground">Principal ID</Label>
            <p className="text-xs font-mono bg-muted px-3 py-2 rounded break-all">
              {principalStr || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={saveMutation.isPending || !displayName.trim()}
          className="gap-2"
          data-ocid="profile.save_button"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
