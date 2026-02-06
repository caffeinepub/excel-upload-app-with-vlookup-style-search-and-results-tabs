import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state/appState';
import { parseWorkbook } from '../lib/excel/parseWorkbook';
import { compareWorkbooks } from '../lib/compare/compareWorkbooks';
import { normalizeHeader, normalizeHeaders } from '../lib/excel/normalizeHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Upload, GitCompare, AlertCircle, FileSpreadsheet, Info } from 'lucide-react';

interface UpdateCheckingTabProps {
  onComparisonComplete?: () => void;
}

// Sanitize sheet names: remove empty/whitespace-only names
function sanitizeSheetNames(sheetNames: string[]): string[] {
  return sheetNames
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

export function UpdateCheckingTab({ onComparisonComplete }: UpdateCheckingTabProps) {
  const { updateCheckingState, setUpdateCheckingState, addToHistory } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [oldParsedSheets, setOldParsedSheets] = useState<Map<string, any> | null>(null);
  const [newParsedSheets, setNewParsedSheets] = useState<Map<string, any> | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const handleOldFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    
    if (!file) return;

    console.log('Uploading old file:', file.name);
    
    // Clear state before starting parse
    setError(null);
    setOldParsedSheets(null);
    setUpdateCheckingState({
      oldWorkbook: null,
      keyColumn: '',
      comparisonResult: null,
    });
    setLoading(true);

    try {
      const parsed = await parseWorkbook(file);
      
      if (!parsed || !parsed.sheetNames || parsed.sheetNames.length === 0) {
        throw new Error('Excel file contains no sheets. Please upload a valid Excel file.');
      }

      // Sanitize sheet names to prevent empty values in Select
      const sanitizedSheetNames = sanitizeSheetNames(parsed.sheetNames);
      
      if (sanitizedSheetNames.length === 0) {
        throw new Error('Excel file contains no valid sheet names. Please upload a file with properly named sheets.');
      }

      const firstSheet = sanitizedSheetNames[0];
      const firstSheetData = parsed.sheets.get(parsed.sheetNames[parsed.sheetNames.indexOf(firstSheet)]);

      if (!firstSheetData) {
        throw new Error('Failed to read first sheet data. Please try a different file.');
      }

      console.log('Old file parsed successfully:', sanitizedSheetNames);
      
      setOldParsedSheets(parsed.sheets);
      setUpdateCheckingState({
        oldWorkbook: {
          fileName: file.name,
          sheetNames: sanitizedSheetNames,
          selectedSheet: firstSheet,
          sheetData: firstSheetData,
        },
      });
      setError(null);
    } catch (err) {
      console.error('Old file upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse old Excel file. Please try again.';
      setError(errorMessage);
      setOldParsedSheets(null);
      setUpdateCheckingState({
        oldWorkbook: null,
        keyColumn: '',
        comparisonResult: null,
      });
    } finally {
      setLoading(false);
      inputElement.value = '';
    }
  };

  const handleNewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    
    if (!file) return;

    console.log('Uploading new file:', file.name);
    
    // Clear state before starting parse to prevent intermediate invalid state
    setError(null);
    setNewParsedSheets(null);
    setUpdateCheckingState({
      newWorkbook: null,
      keyColumn: '',
      comparisonResult: null,
    });
    setLoading(true);

    try {
      const parsed = await parseWorkbook(file);
      
      if (!parsed || !parsed.sheetNames || parsed.sheetNames.length === 0) {
        throw new Error('Excel file contains no sheets. Please upload a valid Excel file.');
      }

      // Sanitize sheet names to prevent empty values in Select
      const sanitizedSheetNames = sanitizeSheetNames(parsed.sheetNames);
      
      if (sanitizedSheetNames.length === 0) {
        throw new Error('Excel file contains no valid sheet names. Please upload a file with properly named sheets.');
      }

      const firstSheet = sanitizedSheetNames[0];
      const firstSheetData = parsed.sheets.get(parsed.sheetNames[parsed.sheetNames.indexOf(firstSheet)]);

      if (!firstSheetData) {
        throw new Error('Failed to read first sheet data. Please try a different file.');
      }

      console.log('New file parsed successfully:', sanitizedSheetNames);
      
      // Only set state after successful parse
      setNewParsedSheets(parsed.sheets);
      setUpdateCheckingState({
        newWorkbook: {
          fileName: file.name,
          sheetNames: sanitizedSheetNames,
          selectedSheet: firstSheet,
          sheetData: firstSheetData,
        },
      });
      setError(null);
    } catch (err) {
      console.error('New file upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse new Excel file. Please try again.';
      setError(errorMessage);
      // Keep state cleared on failure
      setNewParsedSheets(null);
      setUpdateCheckingState({
        newWorkbook: null,
        keyColumn: '',
        comparisonResult: null,
      });
    } finally {
      setLoading(false);
      inputElement.value = '';
    }
  };

  const handleOldSheetChange = (sheetName: string) => {
    if (!updateCheckingState.oldWorkbook || !oldParsedSheets) return;

    const sheetData = oldParsedSheets.get(sheetName);
    
    if (!sheetData) {
      setError(`Failed to load sheet: ${sheetName}. Please try selecting a different sheet.`);
      return;
    }

    setError(null);
    setUpdateCheckingState({
      oldWorkbook: {
        ...updateCheckingState.oldWorkbook,
        selectedSheet: sheetName,
        sheetData: sheetData,
      },
      keyColumn: '',
      comparisonResult: null,
    });
  };

  const handleNewSheetChange = (sheetName: string) => {
    if (!updateCheckingState.newWorkbook || !newParsedSheets) return;

    const sheetData = newParsedSheets.get(sheetName);
    
    if (!sheetData) {
      setError(`Failed to load sheet: ${sheetName}. Please try selecting a different sheet.`);
      return;
    }

    setError(null);
    setUpdateCheckingState({
      newWorkbook: {
        ...updateCheckingState.newWorkbook,
        selectedSheet: sheetName,
        sheetData: sheetData,
      },
      keyColumn: '',
      comparisonResult: null,
    });
  };

  const handleKeyColumnChange = (column: string) => {
    setUpdateCheckingState({ keyColumn: column, comparisonResult: null });
  };

  const handleRunComparison = () => {
    console.log('Running comparison...');
    setError(null);
    setIsComparing(true);

    try {
      if (!updateCheckingState.oldWorkbook?.sheetData) {
        setError('Please upload an old Excel file and select a sheet.');
        setIsComparing(false);
        return;
      }

      if (!updateCheckingState.newWorkbook?.sheetData) {
        setError('Please upload a new Excel file and select a sheet.');
        setIsComparing(false);
        return;
      }

      if (!updateCheckingState.keyColumn) {
        setError('Please select a key column for comparison.');
        setIsComparing(false);
        return;
      }

      console.log('Comparison params:', {
        keyColumn: updateCheckingState.keyColumn,
        mode: 'key-presence',
        oldRows: updateCheckingState.oldWorkbook.sheetData.rows.length,
        newRows: updateCheckingState.newWorkbook.sheetData.rows.length,
      });

      // Use 'key-presence' mode to find items in New but not in Old
      const result = compareWorkbooks(
        updateCheckingState.oldWorkbook.sheetData,
        updateCheckingState.newWorkbook.sheetData,
        updateCheckingState.keyColumn,
        'key-presence'
      );

      console.log('Comparison result:', {
        mode: result.mode,
        newCount: result.summary.newCount,
        totalRows: result.rows.length,
      });

      // This will clear VLOOKUP results and set comparison results
      setUpdateCheckingState({ comparisonResult: result });

      // Add to history
      addToHistory({
        type: 'update-checking',
        timestamp: Date.now(),
        data: {
          oldFileName: updateCheckingState.oldWorkbook.fileName,
          newFileName: updateCheckingState.newWorkbook.fileName,
          keyColumn: updateCheckingState.keyColumn,
          comparisonMode: 'key-presence',
          result: result,
        },
      });

      // Navigate to results tab
      if (onComparisonComplete) {
        console.log('Navigating to results tab');
        onComparisonComplete();
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compare workbooks. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  // Get common columns between old and new workbooks using normalized header matching
  const commonColumns =
    updateCheckingState.oldWorkbook?.sheetData &&
    updateCheckingState.newWorkbook?.sheetData
      ? (() => {
          const oldHeaders = normalizeHeaders(updateCheckingState.oldWorkbook.sheetData.headers);
          const newHeaders = normalizeHeaders(updateCheckingState.newWorkbook.sheetData.headers);
          
          // Find headers that exist in both sheets (case-sensitive after normalization)
          const common = oldHeaders.filter((oldHeader) => 
            newHeaders.some(newHeader => newHeader === oldHeader)
          );
          
          // Remove duplicates
          return Array.from(new Set(common));
        })()
      : [];

  // Auto-select "Patent No." as default key column when both workbooks are loaded
  useEffect(() => {
    if (
      updateCheckingState.oldWorkbook?.sheetData &&
      updateCheckingState.newWorkbook?.sheetData &&
      !updateCheckingState.keyColumn &&
      commonColumns.length > 0
    ) {
      // Check if "Patent No." exists in common columns using normalized matching
      const patentNoColumn = commonColumns.find(col => normalizeHeader(col) === normalizeHeader('Patent No.'));
      if (patentNoColumn) {
        console.log('Auto-selecting Patent No. as key column');
        setUpdateCheckingState({ keyColumn: patentNoColumn });
      }
    }
  }, [updateCheckingState.oldWorkbook, updateCheckingState.newWorkbook, commonColumns.length]);

  // Guard the key column value: if it's not in commonColumns, treat as undefined (not empty string)
  const safeKeyColumnValue = 
    updateCheckingState.keyColumn && commonColumns.includes(updateCheckingState.keyColumn)
      ? updateCheckingState.keyColumn
      : undefined;

  // Guard old workbook selected sheet - ensure it's never empty string
  const safeOldSelectedSheet = 
    updateCheckingState.oldWorkbook && 
    updateCheckingState.oldWorkbook.sheetNames.length > 0 &&
    updateCheckingState.oldWorkbook.sheetNames.includes(updateCheckingState.oldWorkbook.selectedSheet)
      ? updateCheckingState.oldWorkbook.selectedSheet
      : updateCheckingState.oldWorkbook?.sheetNames[0];

  // Guard new workbook selected sheet - ensure it's never empty string
  const safeNewSelectedSheet = 
    updateCheckingState.newWorkbook && 
    updateCheckingState.newWorkbook.sheetNames.length > 0 &&
    updateCheckingState.newWorkbook.sheetNames.includes(updateCheckingState.newWorkbook.selectedSheet)
      ? updateCheckingState.newWorkbook.selectedSheet
      : updateCheckingState.newWorkbook?.sheetNames[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Update Checking</CardTitle>
              <CardDescription>
                Find new items present in the new file but not in the old file based on the selected key column
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Upload two Excel files (old and new versions) and select a key column.
              The system will identify items that exist in the new file but not in the old file based on the key column values.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Excel Upload */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-file-upload">Old Excel File</Label>
                {!updateCheckingState.oldWorkbook ? (
                  <Label
                    htmlFor="old-file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload Old File</span>
                  </Label>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">
                        {updateCheckingState.oldWorkbook.fileName}
                      </span>
                    </div>
                    {updateCheckingState.oldWorkbook.sheetNames.length > 0 && safeOldSelectedSheet ? (
                      <div className="space-y-2">
                        <Label htmlFor="old-sheet-select" className="text-xs">
                          Select Sheet
                        </Label>
                        <Select
                          value={safeOldSelectedSheet}
                          onValueChange={handleOldSheetChange}
                        >
                          <SelectTrigger id="old-sheet-select" className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {updateCheckingState.oldWorkbook.sheetNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No valid sheets found in this file.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      onClick={() => oldFileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      disabled={loading}
                    >
                      Change File
                    </Button>
                  </div>
                )}
                <input
                  ref={oldFileInputRef}
                  id="old-file-upload"
                  type="file"
                  accept=".xlsx"
                  onChange={handleOldFileUpload}
                  disabled={loading}
                  className="hidden"
                />
              </div>
            </div>

            {/* New Excel Upload */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-file-upload">New Excel File</Label>
                {!updateCheckingState.newWorkbook ? (
                  <Label
                    htmlFor="new-file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload New File</span>
                  </Label>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">
                        {updateCheckingState.newWorkbook.fileName}
                      </span>
                    </div>
                    {updateCheckingState.newWorkbook.sheetNames.length > 0 && safeNewSelectedSheet ? (
                      <div className="space-y-2">
                        <Label htmlFor="new-sheet-select" className="text-xs">
                          Select Sheet
                        </Label>
                        <Select
                          value={safeNewSelectedSheet}
                          onValueChange={handleNewSheetChange}
                        >
                          <SelectTrigger id="new-sheet-select" className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {updateCheckingState.newWorkbook.sheetNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No valid sheets found in this file.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      onClick={() => newFileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      disabled={loading}
                    >
                      Change File
                    </Button>
                  </div>
                )}
                <input
                  ref={newFileInputRef}
                  id="new-file-upload"
                  type="file"
                  accept=".xlsx"
                  onChange={handleNewFileUpload}
                  disabled={loading}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Key Column Selection */}
          {updateCheckingState.oldWorkbook?.sheetData &&
            updateCheckingState.newWorkbook?.sheetData && (
              <div className="space-y-2">
                <Label htmlFor="key-column">Key Column</Label>
                {commonColumns.length > 0 ? (
                  <Select
                    value={safeKeyColumnValue}
                    onValueChange={handleKeyColumnChange}
                  >
                    <SelectTrigger id="key-column">
                      <SelectValue placeholder="Select a key column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No common columns with valid names found between the two files. Please ensure both files have matching column headers that are not empty.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleRunComparison}
            disabled={
              loading ||
              isComparing ||
              !updateCheckingState.oldWorkbook?.sheetData ||
              !updateCheckingState.newWorkbook?.sheetData ||
              !safeKeyColumnValue ||
              commonColumns.length === 0
            }
            className="w-full"
            size="lg"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {isComparing ? 'Finding New Items...' : 'Find New Items'}
          </Button>

          {loading && (
            <p className="text-sm text-muted-foreground text-center">Processing files...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
