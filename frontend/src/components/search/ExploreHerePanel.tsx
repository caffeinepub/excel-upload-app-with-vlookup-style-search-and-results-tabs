import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ExploreHerePanelProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExploreHerePanel({ query, isOpen, onClose }: ExploreHerePanelProps) {
  const [iframeError, setIframeError] = useState(false);

  if (!isOpen) return null;

  const searchUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`;

  const handleOpenInNewTab = () => {
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="mac-search-panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex-1">
          <CardTitle className="text-base">Search Results</CardTitle>
          <CardDescription className="text-sm mt-1">
            Showing results for: <span className="font-medium text-foreground">{query}</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Tab
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {iframeError ? (
          <div className="p-6 space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to display search results inline. Some websites prevent embedding for security reasons.
              </AlertDescription>
            </Alert>
            <Button onClick={handleOpenInNewTab} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Search Results in New Tab
            </Button>
          </div>
        ) : (
          <div className="mac-search-iframe-container">
            <iframe
              src={searchUrl}
              title={`Search results for ${query}`}
              className="mac-search-iframe"
              onError={() => setIframeError(true)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
