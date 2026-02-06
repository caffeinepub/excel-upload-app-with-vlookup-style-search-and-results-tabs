import { useRef } from 'react';
import { useAppState } from '../../state/appState';
import { Button } from '../ui/button';
import { RotateCcw, Upload } from 'lucide-react';

export function AppHeader() {
  const { workbook, reset, replaceWorkbook, uploadLoading, setUploadLoading, setUploadError } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceWorkbook = () => {
    if (uploadLoading) return; // Prevent concurrent replaces
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
      const { parseWorkbook } = await import('../../lib/excel/parseWorkbook');
      const parsed = await parseWorkbook(file);
      
      // Validate that workbook has at least one sheet
      if (!parsed.sheetNames || parsed.sheetNames.length === 0) {
        throw new Error('Excel file contains no sheets. Please upload a valid Excel file.');
      }

      // Validate first sheet exists and has data
      const firstSheet = parsed.sheetNames[0];
      const firstSheetData = parsed.sheets.get(firstSheet);
      
      if (!firstSheetData) {
        throw new Error('Failed to read first sheet data. Please try a different file.');
      }

      replaceWorkbook({
        fileName: file.name,
        sheetNames: parsed.sheetNames,
        selectedSheet: firstSheet,
        sheetData: firstSheetData,
      });
      
      setUploadError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Excel file. Please try again.';
      setUploadError(errorMessage);
      console.error('Failed to replace workbook:', error);
    } finally {
      setUploadLoading(false);
      // Always reset input value to allow selecting the same file again
      inputElement.value = '';
    }
  };

  return (
    <header className="border-b bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center flex-shrink-0">
            <img
              src="/assets/CRYSTAL ATLAS LOGO.png"
              alt="Logo"
              className="h-12 sm:h-16 w-auto object-contain"
            />
          </div>
          {workbook && (
            <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
              <Button onClick={handleReplaceWorkbook} variant="outline" size="sm" disabled={uploadLoading}>
                <Upload className={`w-4 h-4 mr-2 ${uploadLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Replace Excel</span>
                <span className="xs:hidden">Replace</span>
              </Button>
              <Button onClick={reset} variant="outline" size="sm" disabled={uploadLoading}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden file input for replace functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="hidden"
      />
    </header>
  );
}
