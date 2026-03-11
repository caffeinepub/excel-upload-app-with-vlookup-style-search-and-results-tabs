import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useListDepartments } from "../../hooks/useDepartments";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useUpdateUserProfileFull,
} from "../../hooks/useUserProfile";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const { data: departments = [] } = useListDepartments();
  const updateMutation = useUpdateUserProfileFull();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile into form state
  useEffect(() => {
    if (!open) return;
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      // If profile has profilePicture bytes, create preview
      if (profile.profilePicture && profile.profilePicture.length > 0) {
        const blob = new Blob([profile.profilePicture.buffer as ArrayBuffer], {
          type: "image/jpeg",
        });
        setAvatarPreview(URL.createObjectURL(blob));
      }
    }
    // Try to load extended fields from localStorage
    try {
      const stored = localStorage.getItem("userProfileFull");
      if (stored) {
        const p = JSON.parse(stored) as Record<string, string | string[]>;
        setPhone((p.phone as string) ?? "");
        setEmail((p.email as string) ?? "");
        setJobTitle((p.jobTitle as string) ?? "");
        setBio((p.bio as string) ?? "");
        setAvatarUrl((p.avatarUrl as string) ?? "");
        setSelectedDepts((p.departments as string[]) ?? []);
      }
    } catch {
      // ignore
    }
  }, [open, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarUrl(url);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeptToggle = (deptName: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName],
    );
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        displayName: displayName.trim(),
        phone,
        email,
        jobTitle,
        bio,
        avatarUrl,
        departments: selectedDepts,
      });
      // Persist to localStorage for UI display
      localStorage.setItem(
        "userProfileFull",
        JSON.stringify({
          phone,
          email,
          jobTitle,
          bio,
          avatarUrl,
          departments: selectedDepts,
        }),
      );
      toast.success("Profile updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const principalStr = identity?.getPrincipal().toString() ?? "";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        data-ocid="profile.sheet"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-14 w-14">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 text-primary-foreground hover:bg-primary/90 transition"
                data-ocid="profile.upload_button"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-bold text-base">
                {displayName || "Your Profile"}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                {principalStr.slice(0, 24)}…
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-name" className="text-sm font-medium">
              Display Name *
            </Label>
            <Input
              id="pm-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              data-ocid="profile.input"
            />
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-title" className="text-sm font-medium">
              Job Title
            </Label>
            <Input
              id="pm-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Researcher"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="pm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-phone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="pm-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-avatar" className="text-sm font-medium">
              Avatar URL (or upload above)
            </Label>
            <Input
              id="pm-avatar"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                if (e.target.value) setAvatarPreview(e.target.value);
              }}
              placeholder="https://…"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-bio" className="text-sm font-medium">
              Bio
            </Label>
            <Textarea
              id="pm-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself…"
              rows={3}
              data-ocid="profile.textarea"
            />
          </div>

          {/* Departments */}
          {departments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Departments</Label>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => {
                  const selected = selectedDepts.includes(d.name);
                  return (
                    <Badge
                      key={String(d.id)}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors"
                      onClick={() => handleDeptToggle(d.name)}
                    >
                      {d.name}
                      {selected && <X className="ml-1 h-2.5 w-2.5" />}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle department membership (multi-select supported)
              </p>
            </div>
          )}

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !displayName.trim()}
            className="w-full gap-2"
            data-ocid="profile.save_button"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {updateMutation.isPending ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
