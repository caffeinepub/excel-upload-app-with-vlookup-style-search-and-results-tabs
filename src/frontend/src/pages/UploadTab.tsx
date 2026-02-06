import { useState, useRef } from 'react';
import { useAppState } from '../state/appState';
import { parseWorkbook, getSheetPreview } from '../lib/excel/parseWorkbook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { DataPreviewTable } from '../components/table/DataPreviewTable';
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw } from 'lucide-react';

export function UploadTab() {
  const { workbook, replaceWorkbook, uploadLoading, uploadError, setUploadLoading, setUploadError } = useAppState();
  const [parsedData, setParsedData] = useState<Map<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
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

      setParsedData(parsed.sheets);

      // Use replaceWorkbook to ensure dependent state is cleared
      replaceWorkbook({
        fileName: file.name,
        sheetNames: parsed.sheetNames,
        selectedSheet: firstSheet,
        sheetData: firstSheetData,
      });
      
      setUploadError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse Excel file. Please try again.';
      setUploadError(errorMessage);
      setParsedData(null);
      // Don't clear workbook on error - keep previous state if it exists
    } finally {
      setUploadLoading(false);
      // Reset input value to allow selecting the same file again
      inputElement.value = '';
    }
  };

  const handleReplaceFile = () => {
    replaceInputRef.current?.click();
  };

  const handleSheetChange = (sheetName: string) => {
    if (!parsedData || !workbook) return;

    const sheetData = parsedData.get(sheetName);
    
    if (!sheetData) {
      setUploadError(`Failed to load sheet: ${sheetName}. Please try selecting a different sheet.`);
      return;
    }

    // Clear any previous errors
    setUploadError(null);

    replaceWorkbook({
      ...workbook,
      selectedSheet: sheetName,
      sheetData: sheetData,
    });
  };

  if (!workbook) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4">
              <img
                src="/assets/generated/excel-upload-hero.dim_1600x900.png"
                alt="Upload Excel"
                className="w-full max-w-md mx-auto rounded-lg"
              />
            </div>
            <CardTitle className="text-2xl">Upload Your Excel File</CardTitle>
            <CardDescription>
              Select an .xlsx file to get started with VLOOKUP searches and data analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors w-full"
            >
              <Upload className="w-12 h-12 text-muted-foreground" />
              <span className="text-sm font-medium">Click to browse or drag and drop</span>
              <span className="text-xs text-muted-foreground">Supports .xlsx files</span>
            </Label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={uploadLoading}
              className="hidden"
            />
            {uploadLoading && <p className="text-sm text-muted-foreground">Loading file...</p>}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const previewData = workbook.sheetData ? getSheetPreview(workbook.sheetData, 20) : null;
  
  // Guard the Select value: ensure it's in the available options
  const safeSelectedSheet = workbook.sheetNames.includes(workbook.selectedSheet) 
    ? workbook.selectedSheet 
    : workbook.sheetNames[0] || '';

  return (
    <div className="space-y-6">
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>File Loaded: {workbook.fileName}</CardTitle>
                <CardDescription>Select a sheet to preview its data</CardDescription>
              </div>
            </div>
            <Button onClick={handleReplaceFile} variant="outline" size="sm" disabled={uploadLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${uploadLoading ? 'animate-spin' : ''}`} />
              Replace Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-select">Select Sheet</Label>
            <Select value={safeSelectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger id="sheet-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workbook.sheetNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewData && (
            <div className="space-y-2">
              <Label>Data Preview (First 20 Rows)</Label>
              <DataPreviewTable data={previewData} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input for replace functionality */}
      <input
        ref={replaceInputRef}
        id="file-upload-replace"
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        disabled={uploadLoading}
        className="hidden"
      />
    </div>
  );
}
