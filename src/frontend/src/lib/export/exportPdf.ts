import { loadLogoAsImage, CRYSTAL_ATLAS_BRANDING } from './branding';

// Define minimal jsPDF types
interface jsPDFStatic {
  new (options?: any): jsPDFInstance;
}

interface jsPDFInstance {
  text: (text: string, x: number, y: number, options?: any) => jsPDFInstance;
  addImage: (imageData: any, format: string, x: number, y: number, width: number, height: number) => jsPDFInstance;
  addPage: () => jsPDFInstance;
  setFontSize: (size: number) => jsPDFInstance;
  setFont: (fontName: string, fontStyle?: string) => jsPDFInstance;
  setTextColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setDrawColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setLineWidth: (width: number) => jsPDFInstance;
  line: (x1: number, y1: number, x2: number, y2: number) => jsPDFInstance;
  rect: (x: number, y: number, width: number, height: number, style?: string) => jsPDFInstance;
  save: (filename: string) => void;
  internal: {
    pageSize: {
      width: number;
      height: number;
    };
  };
}

// Dynamically load jsPDF from CDN
let jsPDF: jsPDFStatic | null = null;

async function loadJsPDF(): Promise<jsPDFStatic> {
  if (jsPDF) return jsPDF;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      jsPDF = (window as any).jspdf?.jsPDF;
      if (jsPDF) {
        resolve(jsPDF);
      } else {
        reject(new Error('Failed to load jsPDF library'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF library'));
    document.head.appendChild(script);
  });
}

export interface ExportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

/**
 * Export data to PDF with Crystal Atlas branding
 */
export async function exportToPdf(data: ExportData, filename: string = 'export.pdf') {
  try {
    const jsPDFClass = await loadJsPDF();
    const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Add logo
    try {
      const logo = await loadLogoAsImage();
      const logoHeight = 15;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, 'PNG', 15, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 5;
    } catch (error) {
      console.warn('Could not load logo for PDF export:', error);
    }

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Deep blue
    doc.text(CRYSTAL_ATLAS_BRANDING.title, 15, yPosition);
    yPosition += 10;

    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 8;

    // Calculate column widths
    const tableWidth = pageWidth - 30;
    const colWidth = tableWidth / data.headers.length;

    // Draw table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    let xPosition = 15;
    data.headers.forEach((header) => {
      doc.text(String(header), xPosition, yPosition, { maxWidth: colWidth - 2 });
      xPosition += colWidth;
    });
    yPosition += 7;

    // Draw header separator
    doc.setDrawColor(100, 100, 100);
    doc.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 5;

    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const row of data.rows) {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPosition = 20;
      }

      xPosition = 15;
      row.forEach((cell) => {
        const cellValue = cell === null || cell === undefined ? '-' : String(cell);
        doc.text(cellValue, xPosition, yPosition, { maxWidth: colWidth - 2 });
        xPosition += colWidth;
      });
      yPosition += 6;
    }

    // Save the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Failed to export to PDF:', error);
    throw new Error('Failed to export to PDF. Please try again.');
  }
}
