import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetRemindersForDate } from "@/hooks/useProductivityQueries";
import { Bell, Calendar, Clock, Repeat, X } from "lucide-react";
import React, { useState, useEffect } from "react";

const SESSION_KEY = "daily_reminders_popup_dismissed";

function getTodayStartMs(): bigint {
  const now = new Date();
  // Use start of today in local time
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  return BigInt(start.getTime());
}

export default function DailyRemindersStartupModal() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const todayMs = getTodayStartMs();
  const { data: reminders, isLoading } = useGetRemindersForDate(todayMs);

  useEffect(() => {
    if (!isAuthenticated || dismissed || isLoading) return;
    if (reminders && reminders.length > 0) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, dismissed, isLoading, reminders]);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, "true");
  };

  if (!isAuthenticated || dismissed) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Today's Reminders
            </DialogTitle>
          </div>
          <DialogDescription>
            {reminders && reminders.length > 0
              ? `You have ${reminders.length} reminder${reminders.length !== 1 ? "s" : ""} for today.`
              : "Loading your reminders..."}
          </DialogDescription>
        </DialogHeader>

        {reminders && reminders.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 my-2">
            {reminders.map((reminder) => (
              <div
                key={reminder.id.toString()}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="mt-0.5 p-1.5 rounded-full bg-primary/10 shrink-0">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {reminder.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {reminder.date}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {reminder.time}
                    </span>
                  </div>
                  {reminder.repeatUntilDate && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Repeat className="w-3 h-3" />
                      Daily repeat active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleDismiss} className="gap-2">
            <X className="w-4 h-4" />
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
