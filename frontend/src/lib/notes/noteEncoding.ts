/**
 * Helper utilities to encode/decode Notes UI fields (title/content) into backend Note.text string
 */

const SEPARATOR = '|||';

/**
 * Encode title and content into a single text string for backend storage
 */
export function encodeNoteText(title: string, content: string): string {
  return `${title}${SEPARATOR}${content}`;
}

/**
 * Decode backend Note.text into title and content for UI display
 */
export function decodeNoteText(text: string): { title: string; content: string } {
  const parts = text.split(SEPARATOR);
  
  if (parts.length >= 2) {
    return {
      title: parts[0],
      content: parts.slice(1).join(SEPARATOR), // Handle content that might contain separator
    };
  }
  
  // Fallback: treat entire text as content with empty title
  return {
    title: '',
    content: text,
  };
}
