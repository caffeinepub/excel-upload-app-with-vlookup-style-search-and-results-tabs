import { useState, useEffect } from 'react';

/**
 * Converts a Uint8Array profile picture to a stable blob URL with automatic cleanup.
 */
export function useAvatarUrl(picture: Uint8Array | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!picture || picture.length === 0) {
      setUrl(null);
      return;
    }
    // Cast to Uint8Array<ArrayBuffer> to satisfy strict BlobPart typing
    const safeBytes = picture instanceof Uint8Array ? picture : new Uint8Array(picture);
    const blob = new Blob([safeBytes as unknown as BlobPart], { type: 'image/jpeg' });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [picture]);

  return url;
}
