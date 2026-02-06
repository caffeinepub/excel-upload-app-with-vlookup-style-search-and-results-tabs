import { loadLogoAsImage, loadTabletLogoAsImage } from './branding';
import { PDF_COMPANY_INFO } from './pdfCompanyInfo';

// Define minimal jsPDF types
interface jsPDFStatic {
  new (options?: any): jsPDFInstance;
}

interface jsPDFInstance {
  text: (text: string | string[], x: number, y: number, options?: any) => jsPDFInstance;
  addImage: (imageData: any, format: string, x: number, y: number, width: number, height: number, alias?: string, compression?: string, rotation?: number) => jsPDFInstance;
  addPage: () => jsPDFInstance;
  setFontSize: (size: number) => jsPDFInstance;
  setFont: (fontName: string, fontStyle?: string) => jsPDFInstance;
  setTextColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setDrawColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setFillColor: (r: number, g?: number, b?: number) => jsPDFInstance;
  setLineWidth: (width: number) => jsPDFInstance;
  setGState: (gState: any) => jsPDFInstance;
  GState: new (options: any) => any;
  line: (x1: number, y1: number, x2: number, y2: number) => jsPDFInstance;
  rect: (x: number, y: number, width: number, height: number, style?: string) => jsPDFInstance;
  save: (filename: string) => void;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, maxWidth: number) => string[];
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
 * Export data to professional PDF with logo branding and tablet-logo watermark
 */
export async function exportToPdf(data: ExportData, filename: string = 'export.pdf') {
  try {
    const jsPDFClass = await loadJsPDF();
    const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const headerHeight = 28;
    const footerHeight = 28;
    const usableHeight = pageHeight - headerHeight - footerHeight;

    let currentPage = 1;

    // Load tablet logo watermark
    let tabletLogo: HTMLImageElement | null = null;
    try {
      tabletLogo = await loadTabletLogoAsImage();
    } catch (error) {
      console.warn('Could not load tablet logo watermark:', error);
      // Continue without watermark
    }

    // Function to draw tiled tablet logo watermark on page
    const drawWatermark = () => {
      if (!tabletLogo) return;

      // Create a tiled pattern of tablet logos with ~30% opacity
      const logoSize = 40; // mm
      const spacing = 20; // mm between logos
      const opacity = 0.3;

      // Set opacity using GState
      const gState = new doc.GState({ opacity });
      doc.setGState(gState);

      // Calculate how many logos fit across and down
      const cols = Math.ceil(pageWidth / (logoSize + spacing)) + 1;
      const rows = Math.ceil(pageHeight / (logoSize + spacing)) + 1;

      // Draw tiled pattern
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * (logoSize + spacing) - logoSize / 2;
          const y = row * (logoSize + spacing) - logoSize / 2;
          
          try {
            doc.addImage(tabletLogo, 'PNG', x, y, logoSize, logoSize);
          } catch (err) {
            console.warn('Failed to add watermark tile:', err);
          }
        }
      }

      // Reset opacity
      const resetGState = new doc.GState({ opacity: 1 });
      doc.setGState(resetGState);
    };

    // Function to add header with logo and contact details to each page
    const addPageHeader = async (yStart: number): Promise<number> => {
      let yPosition = yStart;

      // Add logo on the left
      try {
        const logo = await loadLogoAsImage();
        const logoHeight = 15;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        doc.addImage(logo, 'PNG', margin, yPosition, logoWidth, logoHeight);
      } catch (error) {
        console.warn('Could not load logo for PDF export:', error);
        // Continue without logo
      }

      // Add contact details on the right with wrapping
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const rightX = pageWidth - margin;
      const contactY = yPosition + 4;
      const maxContactWidth = 80;

      // Phone - wrap if needed
      const phoneText = `Contact Us: ${PDF_COMPANY_INFO.headerContact.phone}`;
      const phoneLines = doc.splitTextToSize(phoneText, maxContactWidth);
      doc.text(phoneLines, rightX, contactY, { align: 'right', maxWidth: maxContactWidth });
      
      // Email - wrap if needed
      const emailText = `Email: ${PDF_COMPANY_INFO.headerContact.email}`;
      const emailLines = doc.splitTextToSize(emailText, maxContactWidth);
      doc.text(emailLines, rightX, contactY + 5, { align: 'right', maxWidth: maxContactWidth });

      yPosition += 20;

      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;

      return yPosition;
    };

    // Function to add footer with company information
    const addPageFooter = () => {
      const footerStartY = pageHeight - footerHeight + 5;
      
      // Separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, footerStartY - 3, pageWidth - margin, footerStartY - 3);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      let footerY = footerStartY;
      const footerMaxWidth = pageWidth - 2 * margin;

      // Tagline - wrap if needed
      doc.setFont('helvetica', 'bold');
      const taglineLines = doc.splitTextToSize(PDF_COMPANY_INFO.footer.tagline, footerMaxWidth);
      doc.text(taglineLines, pageWidth / 2, footerY, { align: 'center', maxWidth: footerMaxWidth });
      footerY += 4;

      // Website and Email - wrap if needed
      doc.setFont('helvetica', 'normal');
      const contactLine = `Visit Us: ${PDF_COMPANY_INFO.footer.website}  |  Email Us: ${PDF_COMPANY_INFO.footer.email}`;
      const contactLines = doc.splitTextToSize(contactLine, footerMaxWidth);
      doc.text(contactLines, pageWidth / 2, footerY, { align: 'center', maxWidth: footerMaxWidth });
      footerY += 4;

      // Location - wrap if needed
      const locationLines = doc.splitTextToSize(`Our Location: ${PDF_COMPANY_INFO.footer.location}`, footerMaxWidth);
      doc.text(locationLines, pageWidth / 2, footerY, { align: 'center', maxWidth: footerMaxWidth });
      footerY += 5;

      // Page number
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });
    };

    // Function to draw table header row
    const drawTableHeader = (yPosition: number, colWidths: number[]): number => {
      let xPosition = margin;

      // Header background
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');

      // Header text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      data.headers.forEach((header, idx) => {
        const cellText = String(header);
        const wrappedText = doc.splitTextToSize(cellText, colWidths[idx] - 4);
        doc.text(wrappedText, xPosition + 2, yPosition, { maxWidth: colWidths[idx] - 4 });
        xPosition += colWidths[idx];
      });

      yPosition += 4;

      // Header bottom border
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      return yPosition + 4;
    };

    // Calculate column widths based on content
    const calculateColumnWidths = (): number[] => {
      const tableWidth = pageWidth - 2 * margin;
      const numCols = data.headers.length;
      
      // Equal width for simplicity (can be enhanced to be content-aware)
      const colWidth = tableWidth / numCols;
      return Array(numCols).fill(colWidth);
    };

    const colWidths = calculateColumnWidths();

    // Start first page - draw watermark first (behind content)
    drawWatermark();
    let yPosition = await addPageHeader(margin);
    yPosition = drawTableHeader(yPosition, colWidths);

    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const baseRowHeight = 6;

    for (let rowIdx = 0; rowIdx < data.rows.length; rowIdx++) {
      const row = data.rows[rowIdx];

      // Calculate row height based on wrapped content
      let maxLines = 1;
      row.forEach((cell, cellIdx) => {
        const cellValue = cell === null || cell === undefined ? '-' : String(cell);
        const wrappedLines = doc.splitTextToSize(cellValue, colWidths[cellIdx] - 4);
        maxLines = Math.max(maxLines, wrappedLines.length);
      });
      const rowHeight = baseRowHeight * maxLines;

      // Check if we need a new page
      if (yPosition + rowHeight > margin + usableHeight) {
        addPageFooter();
        doc.addPage();
        currentPage++;
        
        // Draw watermark on new page
        drawWatermark();
        
        yPosition = await addPageHeader(margin);
        yPosition = drawTableHeader(yPosition, colWidths);
      }

      // Draw row cells with wrapping
      let xPosition = margin;
      row.forEach((cell, cellIdx) => {
        const cellValue = cell === null || cell === undefined ? '-' : String(cell);
        const wrappedText = doc.splitTextToSize(cellValue, colWidths[cellIdx] - 4);
        doc.text(wrappedText, xPosition + 2, yPosition, { maxWidth: colWidths[cellIdx] - 4 });
        xPosition += colWidths[cellIdx];
      });

      yPosition += rowHeight;

      // Draw subtle row separator every few rows for readability
      if ((rowIdx + 1) % 5 === 0) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
      }
    }

    // Add footer to last page
    addPageFooter();

    // Save the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Failed to export to PDF:', error);
    throw new Error('Failed to export to PDF. Please try again.');
  }
}
