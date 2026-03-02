import { useState, useRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string, fileUrl?: string, fileName?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({ onSend, disabled, placeholder = 'Type a message...' }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; isImage: boolean } | null>(null);
  const [attachError, setAttachError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setAttachError('File too large (max 1.5MB)');
      return;
    }
    setAttachError('');
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachment({ url: ev.target?.result as string, name: file.name, isImage });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachment) || sending || disabled) return;
    setSending(true);
    try {
      await onSend(text.trim(), attachment?.url, attachment?.name);
      setText('');
      setAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border/40 bg-sidebar-bg px-4 py-3">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50">
          {attachment.isImage ? (
            <img src={attachment.url} alt={attachment.name} className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs text-foreground truncate flex-1">{attachment.name}</span>
          <button onClick={() => setAttachment(null)} className="p-1 rounded hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {attachError && <div className="mb-2 text-xs text-destructive">{attachError}</div>}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !attachment) || sending || disabled}
          className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
