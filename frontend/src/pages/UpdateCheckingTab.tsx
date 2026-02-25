import { useState, useRef } from 'react';
import { useAppState } from '../state/appState';
import { useAddHistoryEntry } from '../hooks/useQueries';
import { parseWorkbook } from '../lib/excel/parseWorkbook';
import { compareWorkbooks } from '../lib/compare/compareWorkbooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { GitCompare, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { HistoryType } from '../backend';

interface UpdateCheckingTabProps {
  onComparisonComplete?: () => void;
}

export function UpdateCheckingTab({ onComparisonComplete }: UpdateCheckingTabProps) {
  const { workbook, setUpdateCheckingResults } = useAppState();
  const addHistory = useAddHistoryEntry();
  const [newFile, setNewFile] = useState<any>(null);
  const [keyColumn, setKeyColumn] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      const parsed = await parseWorkbook(file);

      if (!parsed.sheetNames || parsed.sheetNames.length === 0) {
        throw new Error('Excel file contains no sheets.');
      }

      const firstSheet = parsed.sheetNames[0];
      const firstSheetData = parsed.sheets.get(firstSheet);

      if (!firstSheetData) {
        throw new Error('Failed to read sheet data.');
      }

      setNewFile({
        fileName: file.name,
        sheetData: firstSheetData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse Excel file.';
      setUploadError(errorMessage);
      setNewFile(null);
    }
  };

  const handleCompare = async () => {
    if (!workbook || !workbook.sheetData || !newFile || !keyColumn) {
      alert('Please select a key column');
      return;
    }

    setIsComparing(true);

    try {
      const result = compareWorkbooks(workbook.sheetData, newFile.sheetData, keyColumn, 'key-presence');

      setUpdateCheckingResults(result);

      const newCount = result.rows.filter((r) => r.status === 'new').length;

      // Record history entry
      addHistory.mutate({
        entryType: HistoryType.updateChecking,
        details: `Update checking completed: ${newCount} new item(s) found in "${newFile.fileName}" compared to "${workbook.fileName}"`,
      });

      onComparisonComplete?.();
    } catch (error) {
      console.error('Comparison error:', error);
      alert('An error occurred during comparison. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  if (!workbook) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please upload an Excel file first to use update checking.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Update Checking
          </CardTitle>
          <CardDescription>
            Compare your current file with a new version to identify new items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Current File (Old)</p>
            <p className="text-sm text-muted-foreground">{workbook.fileName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-file">Upload New File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleNewFileUpload}
              className="hidden"
              id="new-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {newFile ? newFile.fileName : 'Choose New File'}
            </Button>
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>

          {newFile && workbook.sheetData && (
            <div className="space-y-2">
              <Label htmlFor="key-column">Key Column (for comparison)</Label>
              <Select value={keyColumn} onValueChange={setKeyColumn}>
                <SelectTrigger id="key-column">
                  <SelectValue placeholder="Select key column" />
                </SelectTrigger>
                <SelectContent>
                  {workbook.sheetData.headers.map((header, index) => (
                    <SelectItem key={`update-key-col-${index}-${header}`} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleCompare}
            disabled={!newFile || !keyColumn || isComparing}
            className="w-full"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Files
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
