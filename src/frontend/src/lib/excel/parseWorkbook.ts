import { SheetData } from '../../state/appState';

// Define minimal XLSX types we need
interface WorkSheet {
  [key: string]: any;
}

interface WorkBook {
  SheetNames: string[];
  Sheets: { [key: string]: WorkSheet };
}

interface XLSXUtils {
  sheet_to_json: (worksheet: WorkSheet, opts?: any) => any[];
}

interface XLSXStatic {
  read: (data: ArrayBuffer, opts?: any) => WorkBook;
  utils: XLSXUtils;
}

// Dynamically import XLSX from CDN with hardened loading
let XLSX: XLSXStatic | null = null;
let loadingPromise: Promise<XLSXStatic> | null = null;

async function loadXLSX(): Promise<XLSXStatic> {
  // Return cached instance if already loaded
  if (XLSX) return XLSX;

  // Return in-flight promise if already loading
  if (loadingPromise) return loadingPromise;

  // Check if XLSX is already available globally (e.g., from a previous load)
  if ((window as any).XLSX) {
    XLSX = (window as any).XLSX;
    if (XLSX) return XLSX;
  }

  // Start new load with timeout
  loadingPromise = new Promise<XLSXStatic>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SheetJS library loading timed out. Please check your internet connection and try again.'));
    }, 15000); // 15 second timeout

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="sheetjs.com"]');
    if (existingScript) {
      clearTimeout(timeout);
      // Wait a bit for it to load
      const checkInterval = setInterval(() => {
        if ((window as any).XLSX) {
          clearInterval(checkInterval);
          XLSX = (window as any).XLSX;
          if (XLSX) {
            resolve(XLSX);
          } else {
            reject(new Error('SheetJS library loaded but XLSX global not found.'));
          }
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!XLSX) {
          reject(new Error('SheetJS library failed to load from existing script.'));
        }
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.async = true;
    
    script.onload = () => {
      clearTimeout(timeout);
      XLSX = (window as any).XLSX;
      if (XLSX) {
        resolve(XLSX);
      } else {
        reject(new Error('SheetJS library loaded but XLSX global not found.'));
      }
    };
    
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load SheetJS library from CDN. Please check your internet connection.'));
    };
    
    document.head.appendChild(script);
  });

  try {
    const result = await loadingPromise;
    loadingPromise = null; // Clear promise after successful load
    return result;
  } catch (error) {
    loadingPromise = null; // Clear promise on error so retry is possible
    throw error;
  }
}

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Map<string, SheetData>;
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  try {
    const XLSX = await loadXLSX();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Validate workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets. Please upload a valid Excel file.');
    }

    const sheets = new Map<string, SheetData>();
    const validSheetNames: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Validate worksheet exists
      if (!worksheet) {
        console.warn(`Sheet "${sheetName}" not found in workbook, skipping.`);
        continue;
      }

      try {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length === 0) {
          sheets.set(sheetName, { headers: [], rows: [] });
          validSheetNames.push(sheetName);
          continue;
        }

        const headers = (jsonData[0] as any[]).map((h) => (h === null ? '' : String(h)));
        const rows = jsonData.slice(1).map((row: any) =>
          (row as any[]).map((cell) => {
            if (cell === null || cell === undefined) return null;
            if (typeof cell === 'string') return cell;
            if (typeof cell === 'number') return cell;
            if (typeof cell === 'boolean') return cell;
            return String(cell);
          })
        );

        sheets.set(sheetName, { headers, rows });
        validSheetNames.push(sheetName);
      } catch (sheetError) {
        console.warn(`Failed to parse sheet "${sheetName}":`, sheetError);
        // Continue with other sheets
      }
    }

    // Final validation: ensure at least one sheet was successfully parsed
    if (sheets.size === 0 || validSheetNames.length === 0) {
      throw new Error('No valid sheets found in Excel file. Please ensure the file contains readable data.');
    }

    return {
      sheetNames: validSheetNames,
      sheets,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Pass through our custom error messages
      throw error;
    }
    throw new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
  }
}

export function getSheetPreview(sheetData: SheetData, maxRows: number = 20): SheetData {
  return {
    headers: sheetData.headers,
    rows: sheetData.rows.slice(0, maxRows),
  };
}
