/**
 * Apply in-memory row edits to a base dataset for export
 * @param baseRows - The original row data
 * @param editedRowsMap - Map of row indices to edited row data
 * @param rowIndices - Array of original row indices corresponding to baseRows
 * @returns Array of rows with edits applied
 */
export function applyRowEdits(
  baseRows: (string | number | boolean | null)[][],
  editedRowsMap: Map<number, (string | number | boolean | null)[]>,
  rowIndices: number[]
): (string | number | boolean | null)[][] {
  return baseRows.map((row, idx) => {
    const originalIndex = rowIndices[idx];
    if (editedRowsMap.has(originalIndex)) {
      return editedRowsMap.get(originalIndex)!;
    }
    return row;
  });
}
