import type { ExpenseEntry } from '../../backend';
import type { ExportData } from '../export/exportPdf';

export type ReportType = 'weekly' | 'monthly' | 'yearly';

/**
 * Get the date range for a given report type
 */
export function getDateRangeForReportType(reportType: ReportType): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (reportType) {
    case 'weekly':
      start.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { start, end };
}

/**
 * Filter expenses by date range
 */
export function filterExpensesByDateRange(
  expenses: ExpenseEntry[],
  start: Date,
  end: Date
): ExpenseEntry[] {
  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });
}

/**
 * Calculate total amount for expenses
 */
export function calculateTotal(expenses: ExpenseEntry[]): number {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

/**
 * Build export data for PDF with totals
 */
export function buildExpenseReportData(
  expenses: ExpenseEntry[],
  reportType: ReportType
): ExportData {
  const { start, end } = getDateRangeForReportType(reportType);
  const filteredExpenses = filterExpensesByDateRange(expenses, start, end);
  
  // Sort by date descending
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const headers = ['Date', 'Type', 'Amount', 'Description'];
  const rows: (string | number)[][] = sortedExpenses.map((expense) => [
    expense.date,
    expense.type,
    Number(expense.amount),
    expense.description || '-',
  ]);

  // Add totals row
  const total = calculateTotal(sortedExpenses);
  rows.push(['', 'TOTAL', total, '']);

  return { headers, rows };
}

/**
 * Generate filename for expense report
 */
export function generateReportFilename(reportType: ReportType): string {
  const { start, end } = getDateRangeForReportType(reportType);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  return `expense-report-${reportType}-${startStr}-to-${endStr}.pdf`;
}
