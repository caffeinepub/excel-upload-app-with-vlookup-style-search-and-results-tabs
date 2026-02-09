import { AlertCircle } from 'lucide-react';

interface CharacterDockModelFallbackProps {
  error?: string;
}

export function CharacterDockModelFallback({ error }: CharacterDockModelFallbackProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="text-center p-4 max-w-xs">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-sm font-medium text-foreground mb-1">Character Unavailable</p>
        <p className="text-xs text-muted-foreground">
          The 3D character model could not be loaded. Your assistant is still here to help!
        </p>
        {error && (
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="text-left break-words">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
