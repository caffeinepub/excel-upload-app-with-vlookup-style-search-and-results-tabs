import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Gift,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
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
  const [birthDate, setBirthDate] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      if (profile.profilePicture && profile.profilePicture.length > 0) {
        const blob = new Blob([profile.profilePicture.buffer as ArrayBuffer], {
          type: "image/jpeg",
        });
        setAvatarPreview(URL.createObjectURL(blob));
      }
    }
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
        setBirthDate((p.birthDate as string) ?? "");
        setJoiningDate((p.joiningDate as string) ?? "");
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
      localStorage.setItem(
        "userProfileFull",
        JSON.stringify({
          phone,
          email,
          jobTitle,
          bio,
          avatarUrl,
          departments: selectedDepts,
          birthDate,
          joiningDate,
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col"
      data-ocid="profile.sheet"
    >
      {/* Hero Header */}
      <div
        className="relative w-full"
        style={{
          background:
            "linear-gradient(135deg, oklch(var(--primary)) 0%, oklch(var(--primary) / 0.7) 50%, oklch(var(--secondary)) 100%)",
          minHeight: "200px",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 text-white backdrop-blur-sm transition"
          data-ocid="profile.close_button"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Avatar + name overlay */}
        <div className="absolute -bottom-16 left-8 flex items-end gap-5">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 bg-primary rounded-full p-2 text-primary-foreground hover:bg-primary/90 transition shadow-lg"
              data-ocid="profile.upload_button"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div className="pb-3">
            <h1 className="text-white text-2xl font-bold drop-shadow-sm">
              {displayName || "Your Profile"}
            </h1>
            {jobTitle && <p className="text-white/80 text-sm">{jobTitle}</p>}
          </div>
        </div>
      </div>

      {/* Content area with top padding to clear avatar */}
      <ScrollArea className="flex-1 mt-20">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* Save button at top */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !displayName.trim()}
              className="gap-2 px-6"
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

          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pm-name">Display Name *</Label>
                  <Input
                    id="pm-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    data-ocid="profile.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pm-birthdate"
                    className="flex items-center gap-1"
                  >
                    <Gift className="h-3 w-3" />
                    Birth Date
                  </Label>
                  <Input
                    id="pm-birthdate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-bio">Bio</Label>
                <Textarea
                  id="pm-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself…"
                  rows={3}
                  data-ocid="profile.textarea"
                />
              </div>
              {principalStr && (
                <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md break-all">
                  ID: {principalStr}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pm-email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="pm-phone" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    id="pm-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-primary" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pm-title" className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Job Title
                  </Label>
                  <Input
                    id="pm-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Researcher"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pm-joiningdate"
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3" />
                    Joining Date
                  </Label>
                  <Input
                    id="pm-joiningdate"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="pm-avatar" className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Avatar URL
                </Label>
                <Input
                  id="pm-avatar"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    if (e.target.value) setAvatarPreview(e.target.value);
                  }}
                  placeholder="https://… (or upload photo above)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          {departments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Departments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => {
                    const selected = selectedDepts.includes(d.name);
                    return (
                      <Badge
                        key={String(d.id)}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer select-none transition-colors text-sm py-1 px-3"
                        onClick={() => handleDeptToggle(d.name)}
                      >
                        {d.name}
                        {selected && <X className="ml-1.5 h-3 w-3" />}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click departments to toggle membership. A user can belong to
                  multiple departments.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Save button at bottom */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !displayName.trim()}
            className="w-full gap-2 h-12 text-base"
            data-ocid="profile.save_button"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {updateMutation.isPending ? "Saving…" : "Save Profile"}
          </Button>

          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
