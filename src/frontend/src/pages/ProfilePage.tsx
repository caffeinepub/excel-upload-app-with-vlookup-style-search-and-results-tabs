/**
 * ProfilePage — full-page in-app profile editor.
 * Organized into 3 sections: Personal Info, Contact Details, Employment Info.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  IdCard,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useListDepartments } from "../hooks/useDepartments";
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
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Banner */}
      <div className="relative h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-2 right-12 w-24 h-24 rounded-full bg-white/20 blur-xl" />
          <div className="absolute top-0 right-1/3 w-16 h-16 rounded-full bg-white/30 blur-lg" />
        </div>
        <div className="absolute top-4 right-6 flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2 bg-white text-blue-700 hover:bg-blue-50 shadow-md"
            data-ocid="profilepage.save_button"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <span className="text-green-600">✓</span>
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
      </div>

      {/* Avatar + Name Header */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="-mt-16 mb-6 flex items-end gap-5">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-slate-800 shadow-xl">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-2 text-white hover:bg-blue-700 transition shadow-lg"
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
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-foreground">
              {displayName || "Your Name"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {jobTitle || "Team Member"}
            </p>
            {selectedDepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedDepts.map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-10">
          {/* Section 1: Personal Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-border flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">
                    Personal Information
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Your name, bio and personal details
                  </p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-name"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <User className="h-3 w-3" /> Display Name *
                  </Label>
                  <Input
                    id="pp-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.name.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-birthdate"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <Calendar className="h-3 w-3" /> Birth Date
                  </Label>
                  <Input
                    id="pp-birthdate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.birthdate.input"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label
                    htmlFor="pp-bio"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <IdCard className="h-3 w-3" /> Bio
                  </Label>
                  <Textarea
                    id="pp-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio about yourself…"
                    rows={3}
                    className="bg-muted/30 border-border resize-none"
                    data-ocid="profilepage.bio.textarea"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact Details */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 border-b border-border flex items-center gap-3">
                <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                  <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Contact Details</h2>
                  <p className="text-xs text-muted-foreground">
                    Email and phone number
                  </p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-email"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    id="pp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.email.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-phone"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <Input
                    id="pp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.phone.input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Employment Info (sidebar) */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 border-b border-border flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
                  <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Employment Info</h2>
                  <p className="text-xs text-muted-foreground">Work details</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-title"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <Briefcase className="h-3 w-3" /> Job Title
                  </Label>
                  <Input
                    id="pp-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Researcher"
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.jobtitle.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pp-joiningdate"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
                  >
                    <Calendar className="h-3 w-3" /> Joining Date
                  </Label>
                  <Input
                    id="pp-joiningdate"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="bg-muted/30 border-border"
                    data-ocid="profilepage.joiningdate.input"
                  />
                </div>
                {departments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Departments
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map((d) => {
                        const selected = selectedDepts.includes(d.name);
                        return (
                          <Badge
                            key={String(d.id)}
                            variant={selected ? "default" : "outline"}
                            className="cursor-pointer select-none transition-all text-xs"
                            onClick={() => handleDeptToggle(d.name)}
                          >
                            {d.name}
                            {selected && <X className="ml-1 h-2.5 w-2.5" />}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to toggle (multi-select)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Principal ID card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Identity
              </p>
              <p className="text-xs font-mono text-foreground/60 break-all leading-relaxed">
                {principalStr || "Not connected"}
              </p>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full gap-2 h-11"
              data-ocid="profilepage.save_bottom_button"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateMutation.isPending ? "Saving…" : "Save All Changes"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Crystal Atlas &mdash; Employee Profile &mdash; www.pharmapolymorph.com
        </p>
      </div>
    </div>
  );
}
