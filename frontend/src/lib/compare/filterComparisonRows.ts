import { ComparisonRow } from './compareWorkbooks';

export type MatchType = 'exact' | 'contains';

/**
 * Filter comparison rows by keyword with null-safe handling
 * Searches across key value and all row cell values
 */
export function filterComparisonRows(
  rows: ComparisonRow[],
  keyword: string,
  matchType: MatchType,
  headers: string[]
): ComparisonRow[] {
  // Empty keyword returns all rows
  if (!keyword || keyword.trim().length === 0) {
    return rows;
  }

  const searchTerm = keyword.trim().toLowerCase();

  return rows.filter((row) => {
    // Collect all searchable values from the row
    const searchableValues: string[] = [];

    // Add key value
    if (row.keyValue !== null && row.keyValue !== undefined) {
      searchableValues.push(String(row.keyValue).toLowerCase());
    }

    // Add all cell values from newData
    row.newData.forEach((cell) => {
      if (cell !== null && cell !== undefined) {
        searchableValues.push(String(cell).toLowerCase());
      }
    });

    // Check if any value matches the search term
    return searchableValues.some((value) => {
      if (matchType === 'exact') {
        return value === searchTerm;
      } else {
        return value.includes(searchTerm);
      }
    });
  });
}
