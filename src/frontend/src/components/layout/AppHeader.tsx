import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { RotateCcw, Upload, User, UserCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { useGetCallerUserProfile } from "../../hooks/useUserProfile";
import { useAppState } from "../../state/appState";
import { LoginButton } from "../auth/LoginButton";
import { ProfileModal } from "../profile/ProfileModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

interface AppHeaderProps {
  onNavigate?: (tab: string) => void;
}

export function AppHeader({ onNavigate }: AppHeaderProps) {
  const {
    workbook,
    reset,
    replaceWorkbook,
    uploadLoading,
    setUploadLoading,
    setUploadError,
  } = useAppState();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: callerProfile } = useGetCallerUserProfile();
  const callerAvatarUrl = useAvatarUrl(callerProfile?.profilePicture ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleReplaceWorkbook = () => {
    if (uploadLoading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;

    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
      const { parseWorkbook } = await import("../../lib/excel/parseWorkbook");
      const parsed = await parseWorkbook(file);

      if (!parsed.sheetNames || parsed.sheetNames.length === 0) {
        throw new Error(
          "Excel file contains no sheets. Please upload a valid Excel file.",
        );
      }

      const firstSheet = parsed.sheetNames[0];
      const firstSheetData = parsed.sheets.get(firstSheet);

      if (!firstSheetData) {
        throw new Error(
          "Failed to read first sheet data. Please try a different file.",
        );
      }

      replaceWorkbook({
        fileName: file.name,
        sheetNames: parsed.sheetNames,
        selectedSheet: firstSheet,
        sheetData: firstSheetData,
      });

      setUploadError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load Excel file. Please try again.";
      setUploadError(errorMessage);
      console.error("Failed to replace workbook:", error);
    } finally {
      setUploadLoading(false);
      inputElement.value = "";
    }
  };

  const handleAttendanceClick = () => {
    if (onNavigate) {
      onNavigate("attendance");
    }
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const callerInitials =
    callerProfile?.displayName
      ?.split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <>
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
      <header className="border-b bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-shrink-0">
              <img
                src="/assets/CRYSTAL ATLAS LOGO.png"
                alt="Logo"
                className="h-12 sm:h-16 w-auto object-contain"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center sm:justify-end items-center">
              {isAuthenticated && (
                <Button
                  onClick={handleProfileClick}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-ocid="header.profile.button"
                >
                  <Avatar className="h-6 w-6">
                    {callerAvatarUrl && (
                      <AvatarImage src={callerAvatarUrl} alt="Profile" />
                    )}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {callerAvatarUrl ? null : callerProfile ? (
                        callerInitials
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {callerProfile?.displayName?.split(" ")[0] ?? "Profile"}
                  </span>
                </Button>
              )}
              <LoginButton />
              {isAuthenticated && (
                <Button
                  onClick={handleAttendanceClick}
                  variant="outline"
                  size="sm"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  <span className="hidden xs:inline">Attendance</span>
                  <span className="xs:hidden">Attend</span>
                </Button>
              )}
              {workbook && (
                <>
                  <Button
                    onClick={handleReplaceWorkbook}
                    variant="outline"
                    size="sm"
                    disabled={uploadLoading}
                  >
                    <Upload
                      className={`w-4 h-4 mr-2 ${uploadLoading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden xs:inline">Replace Excel</span>
                    <span className="xs:hidden">Replace</span>
                  </Button>
                  <Button
                    onClick={reset}
                    variant="outline"
                    size="sm"
                    disabled={uploadLoading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
      </header>
    </>
  );
}
