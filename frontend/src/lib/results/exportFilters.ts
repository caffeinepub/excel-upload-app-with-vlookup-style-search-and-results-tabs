/**
 * Get available columns for filtering
 */
export function getAvailableFilterColumns(headers: string[]): string[] {
  return headers;
}

/**
 * Get available unique values for a specific column
 */
export function getAvailableFilterValues(
  rows: (string | number | boolean | null)[][],
  headers: string[],
  columnName: string
): string[] {
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex === -1) return [];

  const uniqueValues = new Set<string>();
  rows.forEach((row) => {
    const value = row[columnIndex];
    const stringValue = value === null || value === undefined ? '' : String(value);
    uniqueValues.add(stringValue);
  });

  return Array.from(uniqueValues).sort();
}

/**
 * Filter rows based on column and value selection
 * @param rows - The rows to filter
 * @param headers - Column headers
 * @param filterColumn - Column name to filter by (empty string = no filter)
 * @param filterValue - Value to match (empty string = no filter)
 * @returns Filtered rows
 */
export function filterExportRows(
  rows: (string | number | boolean | null)[][],
  headers: string[],
  filterColumn: string,
  filterValue: string
): (string | number | boolean | null)[][] {
  // If no filter is set, return all rows
  if (!filterColumn || !filterValue) {
    return rows;
  }

  const columnIndex = headers.indexOf(filterColumn);
  if (columnIndex === -1) {
    return rows;
  }

  return rows.filter((row) => {
    const cellValue = row[columnIndex];
    const stringValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
    return stringValue === filterValue;
  });
}
