import { useState, useRef } from 'react';
import { useAppState } from '../state/appState';
import { useAddHistoryEntry } from '../hooks/useQueries';
import { parseWorkbook } from '../lib/excel/parseWorkbook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { DataPreviewTable } from '../components/table/DataPreviewTable';
import { Upload, FileSpreadsheet, AlertCircle, RefreshCw } from 'lucide-react';
import { HistoryType } from '../backend';

export function UploadTab() {
  const { workbook, replaceWorkbook, uploadLoading, uploadError, setUploadLoading, setUploadError } = useAppState();
  const [parsedData, setParsedData] = useState<Map<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addHistory = useAddHistoryEntry();

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

      // Record history entry for upload
      addHistory.mutate({
        entryType: HistoryType.upload,
        details: `Uploaded workbook: ${file.name} with ${parsed.sheetNames.length} sheet(s)`,
      });
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
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img
                  src="/assets/generated/patented-round-red-cutout.dim_1200x1200.png"
                  alt="Crystal Atlas"
                  className="max-w-xs w-full h-auto animate-flip-and-rotate motion-reduce:animate-none"
                />
              </div>
            </div>
            <CardTitle className="text-2xl">Upload Excel File</CardTitle>
            <CardDescription>
              Select an Excel file (.xlsx, .xls) to begin working with your data
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {uploadLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Choose File
                </>
              )}
            </Label>

            {uploadError && (
              <Alert variant="destructive" className="w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workbook.sheetData) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load sheet data. Please try uploading the file again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>{workbook.fileName}</CardTitle>
                <CardDescription>
                  {workbook.sheetData.headers.length} columns × {workbook.sheetData.rows.length} rows
                </CardDescription>
              </div>
            </div>
            <input
              ref={replaceInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="replace-file-upload"
            />
            <Button
              variant="outline"
              onClick={handleReplaceFile}
              disabled={uploadLoading}
            >
              {uploadLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Replace File
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workbook.sheetNames.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="sheet-select">Select Sheet</Label>
              <Select value={workbook.selectedSheet} onValueChange={handleSheetChange}>
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
          )}

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3">Data Preview</h3>
            <DataPreviewTable data={workbook.sheetData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
