import { SheetData } from '../../state/appState';
import { findHeaderIndex, normalizeHeader } from '../excel/normalizeHeader';

export interface ComparisonRow {
  status: 'new' | 'updated' | 'unchanged';
  keyValue: string | number | boolean | null;
  oldData?: (string | number | boolean | null)[];
  newData: (string | number | boolean | null)[];
  changedColumns?: number[];
}

export interface ComparisonResult {
  headers: string[];
  rows: ComparisonRow[];
  summary: {
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
  };
  mode: 'row' | 'column' | 'key-presence';
}

/**
 * Compare two workbooks by a key column (matched by header name)
 * Mode 'key-presence': identify keys that exist in New but not in Old
 * Mode 'row': identify rows whose full-row content differs (unmatched data)
 * Mode 'column': identify which columns changed for matching keys
 */
export function compareWorkbooks(
  oldSheet: SheetData,
  newSheet: SheetData,
  keyColumn: string,
  mode: 'row' | 'column' | 'key-presence' = 'key-presence'
): ComparisonResult {
  // Find key column index in both sheets using normalized header matching
  const oldKeyIndex = findHeaderIndex(oldSheet.headers, keyColumn);
  const newKeyIndex = findHeaderIndex(newSheet.headers, keyColumn);

  if (oldKeyIndex === -1) {
    throw new Error(
      `Key column "${keyColumn}" not found in the old sheet. Please select a valid key column that exists in both sheets.`
    );
  }

  if (newKeyIndex === -1) {
    throw new Error(
      `Key column "${keyColumn}" not found in the new sheet. Please select a valid key column that exists in both sheets.`
    );
  }

  // Use new sheet headers as the reference
  const headers = newSheet.headers.map(h => normalizeHeader(h));

  if (mode === 'key-presence') {
    return compareKeyPresence(oldSheet, newSheet, oldKeyIndex, newKeyIndex, headers);
  } else if (mode === 'row') {
    return compareRowDifferences(oldSheet, newSheet, oldKeyIndex, newKeyIndex, headers);
  } else {
    return compareColumnDifferences(oldSheet, newSheet, oldKeyIndex, newKeyIndex, headers);
  }
}

/**
 * Key presence mode: identify keys that exist in New but not in Old.
 * Returns full row data from New sheet for each new key.
 */
function compareKeyPresence(
  oldSheet: SheetData,
  newSheet: SheetData,
  oldKeyIndex: number,
  newKeyIndex: number,
  headers: string[]
): ComparisonResult {
  // Build a set of key values from the old sheet
  const oldKeys = new Set<string>();
  
  oldSheet.rows.forEach((oldRow) => {
    const keyValue = oldRow[oldKeyIndex];
    if (keyValue !== null && keyValue !== undefined) {
      oldKeys.add(String(keyValue));
    }
  });

  const rows: ComparisonRow[] = [];
  let newCount = 0;

  // Process each row in the new sheet
  newSheet.rows.forEach((newRow) => {
    const keyValue = newRow[newKeyIndex];
    
    // Skip rows without key value
    if (keyValue === null || keyValue === undefined) {
      return;
    }

    const keyStr = String(keyValue);
    
    // Only include if the key does NOT exist in old sheet
    if (!oldKeys.has(keyStr)) {
      rows.push({
        status: 'new',
        keyValue,
        newData: newRow,
      });
      newCount++;
    }
  });

  return {
    headers,
    rows,
    summary: {
      newCount,
      updatedCount: 0,
      unchangedCount: 0,
    },
    mode: 'key-presence',
  };
}

/**
 * Row difference mode: compare full-row data and show only unmatched rows.
 * A row is considered matched only when its full normalized content is identical
 * between Old and New sheets (not just when the key exists in both).
 */
function compareRowDifferences(
  oldSheet: SheetData,
  newSheet: SheetData,
  oldKeyIndex: number,
  newKeyIndex: number,
  headers: string[]
): ComparisonResult {
  // Build a set of normalized full-row signatures from the old sheet
  const oldRowSignatures = new Set<string>();
  
  oldSheet.rows.forEach((oldRow) => {
    // Generate deterministic signature for the row
    const signature = JSON.stringify(oldRow);
    oldRowSignatures.add(signature);
  });

  const rows: ComparisonRow[] = [];
  let newCount = 0;

  // Process each row in the new sheet
  newSheet.rows.forEach((newRow) => {
    const keyValue = newRow[newKeyIndex];
    
    // Skip rows without key value
    if (keyValue === null || keyValue === undefined) {
      return;
    }

    // Generate signature for the new row
    const newRowSignature = JSON.stringify(newRow);
    
    // Only include if the full-row signature is NOT in old sheet
    if (!oldRowSignatures.has(newRowSignature)) {
      rows.push({
        status: 'new',
        keyValue,
        newData: newRow,
      });
      newCount++;
    }
  });

  return {
    headers,
    rows,
    summary: {
      newCount,
      updatedCount: 0,
      unchangedCount: 0,
    },
    mode: 'row',
  };
}

/**
 * Column difference mode: show which columns changed for matching keys
 */
function compareColumnDifferences(
  oldSheet: SheetData,
  newSheet: SheetData,
  oldKeyIndex: number,
  newKeyIndex: number,
  headers: string[]
): ComparisonResult {
  // Build a map of old data keyed by the key column value
  const oldDataMap = new Map<string, (string | number | boolean | null)[]>();
  oldSheet.rows.forEach((row) => {
    const keyValue = row[oldKeyIndex];
    if (keyValue !== null && keyValue !== undefined) {
      oldDataMap.set(String(keyValue), row);
    }
  });

  const rows: ComparisonRow[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  // Process each row in the new sheet
  newSheet.rows.forEach((newRow) => {
    const keyValue = newRow[newKeyIndex];
    if (keyValue === null || keyValue === undefined) {
      return; // Skip rows without key value
    }

    const keyStr = String(keyValue);
    const oldRow = oldDataMap.get(keyStr);

    if (!oldRow) {
      // New row (key doesn't exist in old sheet)
      rows.push({
        status: 'new',
        keyValue,
        newData: newRow,
      });
      newCount++;
    } else {
      // Existing row - check for column differences
      const changedColumns: number[] = [];
      
      // Compare each column (excluding the key column itself)
      for (let i = 0; i < newRow.length; i++) {
        // Map new column index to old column index by header name
        const newHeader = newSheet.headers[i];
        const oldColIndex = findHeaderIndex(oldSheet.headers, newHeader);
        
        if (oldColIndex !== -1) {
          const oldValue = oldRow[oldColIndex];
          const newValue = newRow[i];
          
          // Compare values (normalize to string for comparison)
          const oldStr = oldValue === null || oldValue === undefined ? '' : String(oldValue);
          const newStr = newValue === null || newValue === undefined ? '' : String(newValue);
          
          if (oldStr !== newStr) {
            changedColumns.push(i);
          }
        }
      }

      if (changedColumns.length > 0) {
        rows.push({
          status: 'updated',
          keyValue,
          oldData: oldRow,
          newData: newRow,
          changedColumns,
        });
        updatedCount++;
      } else {
        rows.push({
          status: 'unchanged',
          keyValue,
          oldData: oldRow,
          newData: newRow,
          changedColumns: [],
        });
        unchangedCount++;
      }
    }
  });

  return {
    headers,
    rows,
    summary: {
      newCount,
      updatedCount,
      unchangedCount,
    },
    mode: 'column',
  };
}
