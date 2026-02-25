import type { SheetData, SearchResult } from '../../state/appState';

export type MatchType = 'exact' | 'approximate';

/**
 * Perform VLOOKUP with support for multiple return columns
 */
export function vlookup(
  lookupValue: string,
  sheetData: SheetData,
  keyColumn: string,
  returnColumns: string[],
  matchType: MatchType = 'exact'
): SearchResult {
  // Find column indices
  const keyColIndex = sheetData.headers.indexOf(keyColumn);

  if (keyColIndex === -1) {
    return {
      found: false,
      value: null,
      message: `Key column "${keyColumn}" not found in sheet headers.`,
    };
  }

  // Validate return columns
  const returnColIndices = returnColumns.map(col => sheetData.headers.indexOf(col));
  const invalidColumns = returnColumns.filter((_, idx) => returnColIndices[idx] === -1);
  
  if (invalidColumns.length > 0) {
    return {
      found: false,
      value: null,
      message: `Return column(s) not found: ${invalidColumns.join(', ')}`,
    };
  }

  if (matchType === 'exact') {
    return performExactMatch(sheetData, lookupValue, keyColIndex, returnColIndices);
  } else {
    return performApproximateMatch(sheetData, lookupValue, keyColIndex, returnColIndices);
  }
}

function performExactMatch(
  sheetData: SheetData,
  lookupValue: string,
  keyColIndex: number,
  returnColIndices: number[]
): SearchResult {
  const normalizedLookup = String(lookupValue).toLowerCase().trim();

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i];
    const keyValue = row[keyColIndex];
    const normalizedKey = keyValue === null || keyValue === undefined 
      ? '' 
      : String(keyValue).toLowerCase().trim();

    if (normalizedKey === normalizedLookup) {
      // Return first column value if single column, or array if multiple
      const returnValue = returnColIndices.length === 1
        ? row[returnColIndices[0]]
        : returnColIndices.map(idx => row[idx]);

      return {
        found: true,
        value: returnValue,
        rowIndex: i,
        fullRow: { index: i, data: row },
      };
    }
  }

  return {
    found: false,
    value: null,
    message: `No exact match found for "${lookupValue}".`,
  };
}

function performApproximateMatch(
  sheetData: SheetData,
  lookupValue: string,
  keyColIndex: number,
  returnColIndices: number[]
): SearchResult {
  const normalizedLookup = String(lookupValue).toLowerCase().trim();

  // Find rows that contain the lookup value
  const matches: Array<{ index: number; row: (string | number | boolean | null)[] }> = [];

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i];
    const keyValue = row[keyColIndex];
    const normalizedKey = keyValue === null || keyValue === undefined 
      ? '' 
      : String(keyValue).toLowerCase().trim();

    if (normalizedKey.includes(normalizedLookup)) {
      matches.push({ index: i, row });
    }
  }

  if (matches.length === 0) {
    return {
      found: false,
      value: null,
      message: `No approximate match found for "${lookupValue}".`,
    };
  }

  // Return first match
  const firstMatch = matches[0];
  const returnValue = returnColIndices.length === 1
    ? firstMatch.row[returnColIndices[0]]
    : returnColIndices.map(idx => firstMatch.row[idx]);

  return {
    found: true,
    value: returnValue,
    rowIndex: firstMatch.index,
    fullRow: { index: firstMatch.index, data: firstMatch.row },
    message: matches.length > 1 ? `Found ${matches.length} approximate matches. Showing first match.` : undefined,
  };
}
