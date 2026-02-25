import { exportToExcel } from '../export/exportXlsx';
import { exportToPdf } from '../export/exportPdf';
import type { HistoryEntry } from '../../backend';

/**
 * Map HistoryEntry type to readable label
 */
function getTypeLabel(type: string): string {
  switch (type) {
    case 'upload':
      return 'Upload';
    case 'search':
      return 'Search';
    case 'results':
      return 'Results';
    case 'updateChecking':
      return 'Update Checking';
    case 'budgetChange':
      return 'Budget';
    case 'expenseChange':
      return 'Expense';
    default:
      return type;
  }
}

/**
 * Export history entries to Excel
 */
export async function exportHistoryToExcel(
  entries: HistoryEntry[],
  formatDate: (timestamp: bigint) => string
): Promise<void> {
  const headers = ['Type', 'Timestamp', 'Details'];
  const rows = entries.map((entry) => [
    getTypeLabel(entry.entryType),
    formatDate(entry.timestamp),
    entry.details,
  ]);

  await exportToExcel({ headers, rows }, 'crystal-atlas-history.xlsx');
}

/**
 * Export history entries to PDF
 */
export async function exportHistoryToPdf(
  entries: HistoryEntry[],
  formatDate: (timestamp: bigint) => string
): Promise<void> {
  const headers = ['Type', 'Timestamp', 'Details'];
  const rows = entries.map((entry) => [
    getTypeLabel(entry.entryType),
    formatDate(entry.timestamp),
    entry.details,
  ]);

  await exportToPdf({ headers, rows }, 'crystal-atlas-history.pdf');
}
