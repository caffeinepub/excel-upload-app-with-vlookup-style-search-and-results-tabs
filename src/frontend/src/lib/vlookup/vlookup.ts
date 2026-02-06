import { SheetData, SearchParams, SearchResult } from '../../state/appState';

export interface MultiSearchParams {
  lookupValues: string[];
  keyColumn: string;
  returnColumn: string;
  matchType: 'exact' | 'approximate';
}

export interface MultiSearchResult {
  results: Array<{
    lookupValue: string;
    found: boolean;
    value: string | number | boolean | null;
    rowIndex?: number;
    fullRow?: (string | number | boolean | null)[];
    message?: string;
  }>;
  summary: {
    totalSearches: number;
    foundCount: number;
    notFoundCount: number;
  };
}

export function performVlookup(sheetData: SheetData, params: SearchParams): SearchResult {
  const { lookupValue, keyColumn, returnColumn, matchType } = params;

  // Find column indices
  const keyColIndex = sheetData.headers.indexOf(keyColumn);
  const returnColIndex = sheetData.headers.indexOf(returnColumn);

  if (keyColIndex === -1) {
    return {
      found: false,
      value: null,
      message: `Key column "${keyColumn}" not found in sheet headers.`,
    };
  }

  if (returnColIndex === -1) {
    return {
      found: false,
      value: null,
      message: `Return column "${returnColumn}" not found in sheet headers.`,
    };
  }

  if (matchType === 'exact') {
    return performExactMatch(sheetData, lookupValue, keyColIndex, returnColIndex);
  } else {
    return performApproximateMatch(sheetData, lookupValue, keyColIndex, returnColIndex);
  }
}

export function performMultiVlookup(sheetData: SheetData, params: MultiSearchParams): MultiSearchResult {
  const { lookupValues, keyColumn, returnColumn, matchType } = params;

  // Find column indices
  const keyColIndex = sheetData.headers.indexOf(keyColumn);
  const returnColIndex = sheetData.headers.indexOf(returnColumn);

  if (keyColIndex === -1) {
    return {
      results: lookupValues.map(val => ({
        lookupValue: val,
        found: false,
        value: null,
        message: `Key column "${keyColumn}" not found in sheet headers.`,
      })),
      summary: {
        totalSearches: lookupValues.length,
        foundCount: 0,
        notFoundCount: lookupValues.length,
      },
    };
  }

  if (returnColIndex === -1) {
    return {
      results: lookupValues.map(val => ({
        lookupValue: val,
        found: false,
        value: null,
        message: `Return column "${returnColumn}" not found in sheet headers.`,
      })),
      summary: {
        totalSearches: lookupValues.length,
        foundCount: 0,
        notFoundCount: lookupValues.length,
      },
    };
  }

  const results = lookupValues.map(lookupValue => {
    let result: SearchResult;
    if (matchType === 'exact') {
      result = performExactMatch(sheetData, lookupValue, keyColIndex, returnColIndex);
    } else {
      result = performApproximateMatch(sheetData, lookupValue, keyColIndex, returnColIndex);
    }

    // Get full row data if found
    let fullRow: (string | number | boolean | null)[] | undefined;
    if (result.found && result.rowIndex !== undefined) {
      fullRow = sheetData.rows[result.rowIndex];
    }

    return {
      lookupValue,
      found: result.found,
      value: result.value,
      rowIndex: result.rowIndex,
      fullRow,
      message: result.message,
    };
  });

  const foundCount = results.filter(r => r.found).length;

  return {
    results,
    summary: {
      totalSearches: lookupValues.length,
      foundCount,
      notFoundCount: lookupValues.length - foundCount,
    },
  };
}

function performExactMatch(
  sheetData: SheetData,
  lookupValue: string,
  keyColIndex: number,
  returnColIndex: number
): SearchResult {
  const normalizedLookup = String(lookupValue).toLowerCase().trim();

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i];
    const keyValue = row[keyColIndex];

    if (keyValue === null || keyValue === undefined) continue;

    const normalizedKey = String(keyValue).toLowerCase().trim();

    if (normalizedKey === normalizedLookup) {
      const returnValue = row[returnColIndex];
      return {
        found: true,
        value: returnValue,
        rowIndex: i,
        message: `Match found at row ${i + 2} (including header row).`,
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
  returnColIndex: number
): SearchResult {
  // Convert lookup value to number for approximate match
  const lookupNum = parseFloat(lookupValue);

  if (isNaN(lookupNum)) {
    return {
      found: false,
      value: null,
      message: 'Approximate match requires a numeric lookup value.',
    };
  }

  // Find the largest value less than or equal to lookup value
  let bestMatchIndex = -1;
  let bestMatchValue = -Infinity;

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i];
    const keyValue = row[keyColIndex];

    if (keyValue === null || keyValue === undefined) continue;

    const keyNum = typeof keyValue === 'number' ? keyValue : parseFloat(String(keyValue));

    if (isNaN(keyNum)) continue;

    if (keyNum <= lookupNum && keyNum > bestMatchValue) {
      bestMatchValue = keyNum;
      bestMatchIndex = i;
    }
  }

  if (bestMatchIndex === -1) {
    return {
      found: false,
      value: null,
      message: `No approximate match found. All key values are greater than ${lookupNum}.`,
    };
  }

  const returnValue = sheetData.rows[bestMatchIndex][returnColIndex];
  return {
    found: true,
    value: returnValue,
    rowIndex: bestMatchIndex,
    message: `Approximate match found at row ${bestMatchIndex + 2} (key value: ${bestMatchValue}).`,
  };
}
