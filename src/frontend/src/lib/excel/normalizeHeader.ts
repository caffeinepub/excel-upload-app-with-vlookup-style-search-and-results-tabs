/**
 * Normalize Excel header text for consistent matching across files.
 * Trims whitespace and ensures consistent comparison.
 */
export function normalizeHeader(header: string | number | boolean | null | undefined): string {
  if (header === null || header === undefined) {
    return '';
  }
  return String(header).trim();
}

/**
 * Normalize an array of headers, removing empty/whitespace-only values.
 */
export function normalizeHeaders(headers: (string | number | boolean | null)[]): string[] {
  return headers
    .map(normalizeHeader)
    .filter(header => header.length > 0);
}

/**
 * Find the index of a header by normalized name.
 * Returns -1 if not found.
 */
export function findHeaderIndex(
  headers: (string | number | boolean | null)[],
  targetHeader: string
): number {
  const normalizedTarget = normalizeHeader(targetHeader);
  return headers.findIndex(header => normalizeHeader(header) === normalizedTarget);
}

/**
 * Sanitize Excel headers to ensure they are non-empty, unique, and suitable for use as Select values.
 * - Trims whitespace from all headers
 * - Replaces empty/blank headers with "Column N" (where N is 1-based column number)
 * - Disambiguates duplicate headers by appending " (2)", " (3)", etc.
 * - Preserves original column count and order for proper row alignment
 */
export function sanitizeHeaders(headers: (string | number | boolean | null)[]): string[] {
  // Step 1: Trim all headers and replace empty ones with placeholder names
  const trimmedHeaders = headers.map((header, index) => {
    const trimmed = normalizeHeader(header);
    return trimmed.length > 0 ? trimmed : `Column ${index + 1}`;
  });

  // Step 2: Disambiguate duplicates
  const seen = new Map<string, number>();
  const sanitized = trimmedHeaders.map((header) => {
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    
    if (count === 0) {
      return header;
    } else {
      return `${header} (${count + 1})`;
    }
  });

  return sanitized;
}
