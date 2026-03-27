import { FileText, Loader2, Paperclip, Reply, Send, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface ReplyContext {
  senderName: string;
  text: string;
}

interface MessageInputProps {
  onSend: (text: string, fileUrl?: string, fileName?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  replyContext?: ReplyContext | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

export default function MessageInput({
  onSend,
  disabled,
  placeholder = "Type a message...",
  replyContext,
  onCancelReply,
  onTyping,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    isImage: boolean;
  } | null>(null);
  const [attachError, setAttachError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  // biome-ignore lint/correctness/useExhaustiveDependencies: text triggers textarea resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setAttachError("File too large (max 1.5MB)");
      return;
    }
    setAttachError("");
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({
        url: ev.target?.result as string,
        name: file.name,
        isImage,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachment) || sending || disabled) return;
    setSending(true);
    let fullText = text.trim();
    if (replyContext) {
      fullText = `> ${replyContext.senderName}: ${replyContext.text.slice(0, 80)}${replyContext.text.length > 80 ? "…" : ""}\n${fullText}`;
    }
    try {
      await onSend(fullText, attachment?.url, attachment?.name);
      setText("");
      setAttachment(null);
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    onTyping?.();
  };

  const charCount = text.length;
  const showCharCount = charCount > 100;

  return (
    <div className="border-t border-black/5 bg-white/80 backdrop-blur-sm px-4 py-3 flex-shrink-0">
      {/* Reply context */}
      {replyContext && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
          <Reply className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-600">
              {replyContext.senderName}
            </span>
            <span className="text-xs text-gray-500 ml-1.5 truncate">
              {replyContext.text.slice(0, 80)}
            </span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
          {attachment.isImage ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
          )}
          <span className="text-xs text-gray-700 truncate flex-1">
            {attachment.name}
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {attachError && (
        <div className="mb-2 text-xs text-red-500">{attachError}</div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Attach file"
          data-ocid="team.upload_button"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:opacity-50 overflow-y-auto transition-all"
            style={{ minHeight: "42px", maxHeight: "128px" }}
            data-ocid="team.message.input"
          />
          {showCharCount && (
            <span
              className={`absolute right-3 bottom-2.5 text-[10px] tabular-nums ${
                charCount > 280 ? "text-red-400" : "text-gray-400"
              }`}
            >
              {charCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !attachment) || sending || disabled}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 flex-shrink-0 shadow-sm"
          data-ocid="team.message.submit_button"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
