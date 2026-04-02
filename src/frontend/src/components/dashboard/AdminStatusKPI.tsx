import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, PartyPopper, Send, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useApproval } from "../../hooks/useApproval";
import {
  useCreateBroadcast,
  useGetBroadcastHistory,
} from "../../hooks/useBroadcasts";
import { useGetCallerUserProfile } from "../../hooks/useUserProfile";

interface StatusPayload {
  id: number;
  message: string;
  photoB64: string;
  expiresAt: number;
}

interface CommentPayload {
  statusId: number;
  authorName: string;
  text: string;
  ts: number;
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      const maxDim = 400;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = URL.createObjectURL(file);
  });
}

function triggerCelebration() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d")!;
  const particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
  }[] = [];
  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#ff922b",
    "#cc5de8",
  ];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
    });
  }
  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += 3;
      p.vy += 0.1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    frame++;
    if (frame < 300) requestAnimationFrame(animate);
    else document.body.removeChild(canvas);
  };
  requestAnimationFrame(animate);
}

export default function AdminStatusKPI() {
  const { isAdmin } = useApproval();
  const { data: history = [] } = useGetBroadcastHistory();
  const createBroadcast = useCreateBroadcast();
  const { data: profile } = useGetCallerUserProfile();

  const [photoB64, setPhotoB64] = useState("");
  const [message, setMessage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse status from history
  const statusBroadcasts = history.filter((b) =>
    b.text.startsWith("__ADMINSTATUS__"),
  );
  const clearBroadcasts = history.filter((b) =>
    b.text.startsWith("__ADMINSTATUS_CLEAR__"),
  );
  const commentBroadcasts = history.filter((b) =>
    b.text.startsWith("__STATUSCOMMENT__"),
  );

  const latestStatusBroadcast = statusBroadcasts.sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  )[0];

  let parsedStatus: StatusPayload | null = null;
  if (latestStatusBroadcast) {
    try {
      parsedStatus = JSON.parse(
        latestStatusBroadcast.text.replace("__ADMINSTATUS__", ""),
      ) as StatusPayload;
    } catch {
      parsedStatus = null;
    }
  }

  const isExpiredOrCleared =
    !parsedStatus ||
    clearBroadcasts.some(
      (c) => c.createdAt > (latestStatusBroadcast?.createdAt ?? 0n),
    ) ||
    parsedStatus.expiresAt < Date.now();

  const activeStatus = isExpiredOrCleared ? null : parsedStatus;

  const activeComments: CommentPayload[] = activeStatus
    ? commentBroadcasts
        .map((b) => {
          try {
            return JSON.parse(
              b.text.replace("__STATUSCOMMENT__", ""),
            ) as CommentPayload;
          } catch {
            return null;
          }
        })
        .filter(
          (c): c is CommentPayload =>
            c !== null && c.statusId === activeStatus.id,
        )
        .sort((a, b) => a.ts - b.ts)
    : [];

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }
    setIsSending(true);
    try {
      const payload: StatusPayload = {
        id: Date.now(),
        message: message.trim(),
        photoB64,
        expiresAt: Date.now() + 43200000,
      };
      await createBroadcast.mutateAsync(
        `__ADMINSTATUS__${JSON.stringify(payload)}`,
      );
      setMessage("");
      setPhotoB64("");
      toast.success("Status posted! Visible for 12 hours.");
    } catch {
      toast.error("Failed to post status");
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await createBroadcast.mutateAsync("__ADMINSTATUS_CLEAR__");
      toast.success("Status removed");
    } catch {
      toast.error("Failed to remove status");
    } finally {
      setIsClearing(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !activeStatus) return;
    setIsSendingComment(true);
    try {
      const comment: CommentPayload = {
        statusId: activeStatus.id,
        authorName: profile?.displayName || "User",
        text: commentText.trim(),
        ts: Date.now(),
      };
      await createBroadcast.mutateAsync(
        `__STATUSCOMMENT__${JSON.stringify(comment)}`,
      );
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoB64(compressed);
    } catch {
      toast.error("Failed to process image");
    }
  };

  const timeLeftLabel = activeStatus
    ? (() => {
        const ms = activeStatus.expiresAt - Date.now();
        if (ms <= 0) return "Expired";
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
      })()
    : "";

  return (
    <div
      className="rounded-2xl bg-card border border-border/40 shadow-mac-soft overflow-hidden"
      data-ocid="admin_status.card"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              Admin Status
            </div>
            <div className="text-xs text-muted-foreground">
              {activeStatus ? `Active · ${timeLeftLabel}` : "No active status"}
            </div>
          </div>
        </div>
        {isAdmin && activeStatus && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={isClearing}
            className="text-destructive hover:text-destructive"
            data-ocid="admin_status.delete_button"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Status Display */}
      {activeStatus ? (
        <div>
          {/* Part 1: Photo */}
          {activeStatus.photoB64 && (
            <div className="relative">
              <img
                src={activeStatus.photoB64}
                alt="Admin status"
                className="w-full object-contain rounded-none bg-black/5"
                style={{ maxHeight: "60vh" }}
              />
            </div>
          )}
          {/* Part 2: Message */}
          <div className="p-5">
            <p className="text-base font-medium text-foreground leading-relaxed">
              {activeStatus.message}
            </p>
          </div>

          {/* Comments */}
          <div className="border-t border-border/40 p-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Comments ({activeComments.length})
            </p>
            {activeComments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeComments.map((c, i) => (
                  <div
                    key={c.ts}
                    className="flex gap-2.5 items-start"
                    data-ocid={`admin_status.item.${i + 1}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                      {c.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        {c.authorName}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeComments.length === 0 && (
              <p
                className="text-xs text-muted-foreground"
                data-ocid="admin_status.empty_state"
              >
                No comments yet. Be the first!
              </p>
            )}
            {/* Comment Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment…"
                className="flex-1 text-sm bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                data-ocid="admin_status.input"
              />
              <Button
                size="sm"
                onClick={handleComment}
                disabled={isSendingComment || !commentText.trim()}
                data-ocid="admin_status.submit_button"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Celebrate button */}
          <div className="px-5 pb-5">
            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white font-bold shadow-md"
              onClick={triggerCelebration}
              data-ocid="admin_status.primary_button"
            >
              <PartyPopper className="h-4 w-4 mr-2" />🎉 Celebrate!
            </Button>
          </div>
        </div>
      ) : (
        /* No active status - show placeholder to all, compose to admin */
        <div className="p-5">
          {!isAdmin && (
            <div
              className="text-center text-muted-foreground text-sm py-8"
              data-ocid="admin_status.empty_state"
            >
              <PartyPopper className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No active admin status right now.</p>
            </div>
          )}
          {isAdmin && (
            <div className="space-y-3">
              {/* Photo upload */}
              <div>
                <label
                  htmlFor="status-photo-upload"
                  className="text-xs font-semibold text-muted-foreground block mb-1.5"
                >
                  Photo (optional)
                </label>
                {photoB64 ? (
                  <div className="relative">
                    <img
                      src={photoB64}
                      alt="Preview"
                      className="w-full max-h-40 object-cover rounded-xl border border-border/40"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoB64("")}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                      data-ocid="admin_status.close_button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border/60 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    data-ocid="admin_status.upload_button"
                  >
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to upload photo
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  id="status-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  data-ocid="admin_status.dropzone"
                />
              </div>

              {/* Message textarea */}
              <div>
                <label
                  htmlFor="status-message"
                  className="text-xs font-semibold text-muted-foreground block mb-1.5"
                >
                  Message *
                </label>
                <Textarea
                  id="status-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share an update, announcement, or celebration…"
                  rows={3}
                  className="resize-none text-sm"
                  data-ocid="admin_status.textarea"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                data-ocid="admin_status.primary_button"
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Post Status (12h)
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
