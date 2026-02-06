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
