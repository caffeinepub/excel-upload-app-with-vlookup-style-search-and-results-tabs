import { loadLogoAsBase64, CRYSTAL_ATLAS_BRANDING } from './branding';

// Define minimal XLSX types we need for export
interface WorkSheet {
  [key: string]: any;
}

interface WorkBook {
  SheetNames: string[];
  Sheets: { [key: string]: WorkSheet };
}

interface XLSXUtils {
  aoa_to_sheet: (data: any[][], opts?: any) => WorkSheet;
  book_new: () => WorkBook;
  book_append_sheet: (workbook: WorkBook, worksheet: WorkSheet, name: string) => void;
}

interface XLSXStatic {
  utils: XLSXUtils;
  write: (workbook: WorkBook, opts?: any) => any;
}

// Dynamically load XLSX from CDN
let XLSX: XLSXStatic | null = null;

async function loadXLSX(): Promise<XLSXStatic> {
  if (XLSX) return XLSX;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => {
      XLSX = (window as any).XLSX;
      if (XLSX) {
        resolve(XLSX);
      } else {
        reject(new Error('Failed to load XLSX library'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load XLSX library'));
    document.head.appendChild(script);
  });
}

export interface ExportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

/**
 * Export data to Excel with Crystal Atlas branding
 */
export async function exportToExcel(data: ExportData, filename: string = 'export.xlsx') {
  try {
    const XLSX = await loadXLSX();

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data with branding header
    const exportData: any[][] = [
      [CRYSTAL_ATLAS_BRANDING.title], // Title row
      [], // Empty row
      data.headers, // Column headers
      ...data.rows, // Data rows
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Download file
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    throw new Error('Failed to export to Excel. Please try again.');
  }
}
