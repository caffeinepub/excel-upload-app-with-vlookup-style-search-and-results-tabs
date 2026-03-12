/**
 * ProfilePage — rendered in a new browser tab.
 * It reads/writes profile data via localStorage and the backend canister.
 * Opened by AppHeader's Profile button.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useListDepartments } from "../hooks/useDepartments";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useUpdateUserProfileFull,
} from "../hooks/useUserProfile";

export function ProfilePage() {
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
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
        if (p.avatarUrl) setAvatarPreview(p.avatarUrl as string);
      }
    } catch {
      // ignore
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setAvatarUrl(url);
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
      setSaved(true);
      toast.success("Profile saved successfully!");
      setTimeout(() => setSaved(false), 2500);
    } catch {
      toast.error("Failed to save profile. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/assets/CRYSTAL ATLAS LOGO.png"
            alt="Crystal Atlas"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">My Profile</h1>
            <p className="text-xs text-muted-foreground">
              Crystal Atlas — Employee Profile
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2"
          data-ocid="profilepage.save_button"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <span className="text-green-300">✓</span>
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateMutation.isPending
            ? "Saving…"
            : saved
              ? "Saved!"
              : "Save Profile"}
        </Button>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Avatar section */}
          <div className="px-8 pb-8">
            <div className="flex items-end gap-5 -mt-12 mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-900 shadow-lg">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 text-primary-foreground hover:bg-primary/90 transition shadow"
                  data-ocid="profilepage.upload_button"
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
              <div className="mb-2">
                <p className="text-xl font-bold text-foreground">
                  {displayName || "Your Name"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {jobTitle || "Team Member"}
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                  {principalStr.slice(0, 20)}…
                </p>
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-name"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Display Name *
                </Label>
                <Input
                  id="pp-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.name.input"
                />
              </div>

              {/* Job Title */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-title"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Job Title
                </Label>
                <Input
                  id="pp-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Researcher"
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.jobtitle.input"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-email"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="pp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.email.input"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-phone"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Phone
                </Label>
                <Input
                  id="pp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.phone.input"
                />
              </div>

              {/* Birth Date */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-birthdate"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Birth Date
                </Label>
                <Input
                  id="pp-birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.birthdate.input"
                />
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pp-joiningdate"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Joining Date
                </Label>
                <Input
                  id="pp-joiningdate"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.joiningdate.input"
                />
              </div>

              {/* Bio — full width */}
              <div className="space-y-1.5 md:col-span-2">
                <Label
                  htmlFor="pp-bio"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Bio
                </Label>
                <Textarea
                  id="pp-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself…"
                  rows={3}
                  className="border-0 border-b rounded-none bg-transparent px-0 resize-none focus-visible:ring-0 focus-visible:border-primary"
                  data-ocid="profilepage.bio.textarea"
                />
              </div>

              {/* Departments */}
              {departments.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Departments
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
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
                    Click to toggle department (multi-select)
                  </p>
                </div>
              )}
            </div>

            {/* Save at bottom too */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-2 px-8"
                data-ocid="profilepage.save_bottom_button"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {updateMutation.isPending ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Crystal Atlas &mdash; Employee Profile Card &mdash;
          www.pharmapolymorph.com
        </p>
      </div>
    </div>
  );
}
