/**
 * Utility to generate deterministic, null-safe, header-ordered row signatures
 * for full-row equality checks in Update Checking comparison.
 */

/**
 * Generate a normalized signature for a row based on a specific header order.
 * This signature is used to determine if two rows are identical.
 * 
 * @param row - The row data array
 * @param headers - The headers defining the column order
 * @returns A deterministic string signature representing the row
 */
export function generateRowSignature(
  row: (string | number | boolean | null)[],
  headers: string[]
): string {
  // Ensure row length matches headers length (pad with null if needed)
  const normalizedRow = headers.map((_, idx) => {
    const value = row[idx];
    // Normalize null/undefined to empty string for consistent comparison
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  });

  // Join with a delimiter that won't appear in normal data
  // Use JSON.stringify for deterministic serialization
  return JSON.stringify(normalizedRow);
}

/**
 * Align an old row to the new sheet's header order by mapping header names.
 * Missing columns in old sheet are filled with null.
 * Old-only columns are ignored.
 * 
 * @param oldRow - The row from the old sheet
 * @param oldHeaders - Headers from the old sheet
 * @param newHeaders - Headers from the new sheet (defines output order)
 * @returns A new row array aligned to newHeaders order
 */
export function alignRowToNewHeaders(
  oldRow: (string | number | boolean | null)[],
  oldHeaders: (string | number | boolean | null)[],
  newHeaders: string[]
): (string | number | boolean | null)[] {
  // Normalize old headers for matching
  const normalizedOldHeaders = oldHeaders.map(h => 
    h === null || h === undefined ? '' : String(h).trim()
  );

  // Build a map from normalized header name to old column index
  const oldHeaderMap = new Map<string, number>();
  normalizedOldHeaders.forEach((header, idx) => {
    if (header.length > 0) {
      oldHeaderMap.set(header, idx);
    }
  });

  // Map each new header to its corresponding old column value
  return newHeaders.map(newHeader => {
    const normalizedNewHeader = newHeader.trim();
    const oldIdx = oldHeaderMap.get(normalizedNewHeader);
    
    if (oldIdx !== undefined && oldIdx < oldRow.length) {
      return oldRow[oldIdx];
    }
    
    // Column doesn't exist in old sheet - return null
    return null;
  });
}
