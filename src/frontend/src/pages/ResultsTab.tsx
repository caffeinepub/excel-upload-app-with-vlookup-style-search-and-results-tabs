import { useAppState } from '../state/appState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { CheckCircle2, XCircle, Info, Download, GitCompare, Edit2, Save, X as XIcon } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { exportToExcel } from '../lib/export/exportXlsx';
import { exportToPdf } from '../lib/export/exportPdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HorizontalTableScroll } from '../components/table/HorizontalTableScroll';
import { UpdateCheckingResultsSearchBar } from '../components/updateChecking/UpdateCheckingResultsSearchBar';
import { filterComparisonRows, MatchType } from '../lib/compare/filterComparisonRows';
import type { MultiSearchResult } from '../state/appState';

interface ResultsTabProps {
  onNavigateToUpdateChecking?: () => void;
}

export function ResultsTab({ onNavigateToUpdateChecking }: ResultsTabProps) {
  const { workbook, searchParams, searchResult, setSearchResult, updateCheckingState, updateWorkbookRow } = useAppState();
  const [exporting, setExporting] = useState(false);
  
  // Search state for Update Checking results
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchMatchType, setSearchMatchType] = useState<MatchType>('contains');

  // Edit state for VLOOKUP results
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editedRow, setEditedRow] = useState<(string | number | boolean | null)[]>([]);

  // Debug logging
  useEffect(() => {
    console.log('ResultsTab - searchResult:', searchResult);
    console.log('ResultsTab - updateCheckingState.comparisonResult:', updateCheckingState.comparisonResult);
  }, [searchResult, updateCheckingState.comparisonResult]);

  const handleClearSearch = () => {
    setSearchKeyword('');
  };

  const handleStartEdit = (rowIndex: number, currentRow: (string | number | boolean | null)[]) => {
    setEditingRowIndex(rowIndex);
    setEditedRow([...currentRow]);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditedRow([]);
  };

  const handleSaveEdit = () => {
    if (editingRowIndex !== null && workbook?.sheetData) {
      updateWorkbookRow(editingRowIndex, editedRow);
      setEditingRowIndex(null);
      setEditedRow([]);
      
      // Show success message
      alert('Row updated successfully. Changes are saved in memory and will be included in exports.');
    }
  };

  const handleCellEdit = (colIndex: number, value: string) => {
    const newRow = [...editedRow];
    // Try to preserve type
    let parsedValue: string | number | boolean | null = value;
    if (value === '') {
      parsedValue = null;
    } else if (!isNaN(Number(value)) && value.trim() !== '') {
      parsedValue = Number(value);
    } else if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    }
    newRow[colIndex] = parsedValue;
    setEditedRow(newRow);
  };

  const handleExportVlookupExcel = async () => {
    if (!searchResult || !searchParams || !workbook?.sheetData) return;

    setExporting(true);
    try {
      const multiResult = searchResult as MultiSearchResult;
      
      // Export full workbook with edits
      await exportToExcel(
        {
          headers: workbook.sheetData.headers,
          rows: workbook.sheetData.rows,
        },
        `crystal-atlas-workbook-edited-${Date.now()}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportVlookupPdf = async () => {
    if (!searchResult || !searchParams || !workbook?.sheetData) return;

    setExporting(true);
    try {
      const multiResult = searchResult as MultiSearchResult;
      
      // Export matched rows only
      const matchedRows = multiResult.results
        .filter(r => r.found && r.fullRow)
        .map(r => r.fullRow!);

      await exportToPdf(
        {
          headers: workbook.sheetData.headers,
          rows: matchedRows,
        },
        `crystal-atlas-vlookup-results-${Date.now()}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Filter comparison rows based on search - only show NEW rows
  const filteredComparisonRows = useMemo(() => {
    if (!updateCheckingState.comparisonResult) {
      console.log('No comparison result available');
      return null;
    }
    
    // Only include NEW rows
    const newRowsOnly = updateCheckingState.comparisonResult.rows.filter(row => row.status === 'new');
    console.log('New rows only (before filtering):', newRowsOnly.length);
    
    const filtered = filterComparisonRows(
      newRowsOnly,
      searchKeyword,
      searchMatchType,
      updateCheckingState.comparisonResult.headers
    );
    
    console.log('Filtered comparison rows:', filtered.length);
    return filtered;
  }, [updateCheckingState.comparisonResult, searchKeyword, searchMatchType]);

  const handleExportComparisonExcel = async () => {
    if (!updateCheckingState.comparisonResult || !filteredComparisonRows || filteredComparisonRows.length === 0) return;

    setExporting(true);
    try {
      const result = updateCheckingState.comparisonResult;
      const keyColumnName = updateCheckingState.keyColumn || 'Key';
      
      // Build headers: Key column + all New sheet columns (excluding the key column to avoid duplication)
      const newSheetHeaders = result.headers;
      const keyColumnIndex = newSheetHeaders.findIndex(h => h.toLowerCase() === keyColumnName.toLowerCase());
      
      // Filter out the key column from trailing headers
      const trailingHeaders = newSheetHeaders.filter((_, idx) => idx !== keyColumnIndex);
      const exportHeaders = [keyColumnName, ...trailingHeaders];
      
      // Build rows: Key value + all New sheet row values (excluding the key column cell)
      const rows = filteredComparisonRows.map((row) => {
        const keyValue = row.keyValue === null || row.keyValue === undefined ? '' : String(row.keyValue);
        const trailingCells = row.newData.filter((_, idx) => idx !== keyColumnIndex);
        return [keyValue, ...trailingCells];
      });
      
      await exportToExcel(
        {
          headers: exportHeaders,
          rows,
        },
        `crystal-atlas-new-items-${Date.now()}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportComparisonPdf = async () => {
    if (!updateCheckingState.comparisonResult || !filteredComparisonRows || filteredComparisonRows.length === 0) return;

    setExporting(true);
    try {
      const result = updateCheckingState.comparisonResult;
      const keyColumnName = updateCheckingState.keyColumn || 'Key';
      
      // Build headers: Key column + all New sheet columns (excluding the key column to avoid duplication)
      const newSheetHeaders = result.headers;
      const keyColumnIndex = newSheetHeaders.findIndex(h => h.toLowerCase() === keyColumnName.toLowerCase());
      
      // Filter out the key column from trailing headers
      const trailingHeaders = newSheetHeaders.filter((_, idx) => idx !== keyColumnIndex);
      const exportHeaders = [keyColumnName, ...trailingHeaders];
      
      // Build rows: Key value + all New sheet row values (excluding the key column cell)
      const rows = filteredComparisonRows.map((row) => {
        const keyValue = row.keyValue === null || row.keyValue === undefined ? '' : String(row.keyValue);
        const trailingCells = row.newData.filter((_, idx) => idx !== keyColumnIndex);
        return [keyValue, ...trailingCells];
      });
      
      await exportToPdf(
        {
          headers: exportHeaders,
          rows,
        },
        `crystal-atlas-new-items-${Date.now()}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Determine which results to show
  const hasComparisonResults = updateCheckingState.comparisonResult !== null;
  const hasVlookupResults = searchResult !== null;

  console.log('Display decision - hasComparisonResults:', hasComparisonResults, 'hasVlookupResults:', hasVlookupResults);

  // Show comparison results if available - only new items
  if (hasComparisonResults && filteredComparisonRows !== null) {
    const result = updateCheckingState.comparisonResult!;
    const displayRowCount = filteredComparisonRows.length;
    const keyColumnName = updateCheckingState.keyColumn || 'Key';

    console.log('Displaying comparison results, row count:', displayRowCount);

    // Find key column index to avoid duplication
    const newSheetHeaders = result.headers;
    const keyColumnIndex = newSheetHeaders.findIndex(h => h.toLowerCase() === keyColumnName.toLowerCase());
    const trailingHeaders = newSheetHeaders.filter((_, idx) => idx !== keyColumnIndex);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <GitCompare className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="break-words">Update Checking Results</CardTitle>
                  <CardDescription className="break-words">
                    Items present in the new file but not in the old file based on {keyColumnName}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleExportComparisonExcel}
                  disabled={exporting || displayRowCount === 0}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  onClick={handleExportComparisonPdf}
                  disabled={exporting || displayRowCount === 0}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                {onNavigateToUpdateChecking && (
                  <Button onClick={onNavigateToUpdateChecking} variant="outline" size="sm">
                    Re-run
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <UpdateCheckingResultsSearchBar
              keyword={searchKeyword}
              matchType={searchMatchType}
              onKeywordChange={setSearchKeyword}
              onMatchTypeChange={setSearchMatchType}
              onClear={handleClearSearch}
            />

            {/* Summary Card - Only New Items */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{displayRowCount}</div>
                <div className="text-sm text-muted-foreground">
                  {searchKeyword ? 'Filtered New Items' : 'New Items'}
                </div>
              </div>
            </div>

            {/* Show only new items */}
            {displayRowCount > 0 ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  New Items (present in new file but not in old file)
                </Label>
                <ScrollArea className="h-[500px] rounded-md border">
                  <HorizontalTableScroll className="p-4">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                            {keyColumnName}
                          </th>
                          {trailingHeaders.map((header, idx) => (
                            <th
                              key={idx}
                              className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComparisonRows.map((row, idx) => {
                          const trailingCells = row.newData.filter((_, cellIdx) => cellIdx !== keyColumnIndex);
                          return (
                            <tr
                              key={idx}
                              className="border-b hover:bg-muted/50 transition-colors"
                            >
                              <td className="p-2 text-sm font-medium whitespace-nowrap">
                                {row.keyValue === null || row.keyValue === undefined
                                  ? '-'
                                  : String(row.keyValue)}
                              </td>
                              {trailingCells.map((cell, cellIdx) => (
                                <td key={cellIdx} className="p-2 text-sm whitespace-nowrap">
                                  {cell === null || cell === undefined ? '-' : String(cell)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </HorizontalTableScroll>
                </ScrollArea>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {searchKeyword 
                    ? `No items match your search criteria "${searchKeyword}".`
                    : 'No new items found. All items in the new file already exist in the old file.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show VLOOKUP results
  if (hasVlookupResults && workbook?.sheetData) {
    const multiResult = searchResult as MultiSearchResult;
    console.log('Displaying Multi-VLOOKUP results:', multiResult);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <CardTitle>VLOOKUP Search Results</CardTitle>
                  <CardDescription className="break-words">
                    {multiResult.summary.foundCount} of {multiResult.summary.totalSearches} lookup values matched
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleExportVlookupExcel}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export Full Workbook</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
                <Button
                  onClick={handleExportVlookupPdf}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export Results PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{multiResult.summary.totalSearches}</div>
                <div className="text-sm text-muted-foreground">Total Searches</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{multiResult.summary.foundCount}</div>
                <div className="text-sm text-muted-foreground">Matches Found</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{multiResult.summary.notFoundCount}</div>
                <div className="text-sm text-muted-foreground">Not Found</div>
              </div>
            </div>

            {/* Results Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Matched Rows (editable)
                </Label>
                {editingRowIndex !== null && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm" variant="default">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancelEdit} size="sm" variant="outline">
                      <XIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              
              <ScrollArea className="h-[500px] rounded-md border">
                <HorizontalTableScroll className="p-4">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-semibold text-muted-foreground w-24 whitespace-nowrap">
                          Actions
                        </th>
                        <th className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                          Lookup Value
                        </th>
                        <th className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                          Status
                        </th>
                        {workbook.sheetData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {multiResult.results.map((result, idx) => {
                        if (!result.found || !result.fullRow) {
                          return (
                            <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="p-2 text-sm whitespace-nowrap">-</td>
                              <td className="p-2 text-sm font-medium whitespace-nowrap">{result.lookupValue}</td>
                              <td className="p-2 text-sm whitespace-nowrap">
                                <Badge variant="secondary">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Not Found
                                </Badge>
                              </td>
                              <td colSpan={workbook.sheetData?.headers.length || 1} className="p-2 text-sm text-muted-foreground whitespace-nowrap">
                                {result.message}
                              </td>
                            </tr>
                          );
                        }

                        const isEditing = editingRowIndex === result.rowIndex;
                        const displayRow = isEditing ? editedRow : result.fullRow;

                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-2 text-sm whitespace-nowrap">
                              {!isEditing && (
                                <Button
                                  onClick={() => handleStartEdit(result.rowIndex!, result.fullRow!)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                            <td className="p-2 text-sm font-medium whitespace-nowrap">{result.lookupValue}</td>
                            <td className="p-2 text-sm whitespace-nowrap">
                              <Badge variant="default">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Found
                              </Badge>
                            </td>
                            {displayRow.map((cell, cellIdx) => (
                              <td key={cellIdx} className="p-2 text-sm">
                                {isEditing ? (
                                  <Input
                                    value={cell === null || cell === undefined ? '' : String(cell)}
                                    onChange={(e) => handleCellEdit(cellIdx, e.target.value)}
                                    className="h-8 text-sm min-w-[100px]"
                                  />
                                ) : (
                                  <span className="whitespace-nowrap">{cell === null || cell === undefined ? '-' : String(cell)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </HorizontalTableScroll>
              </ScrollArea>
            </div>

            {multiResult.summary.notFoundCount > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {multiResult.summary.notFoundCount} lookup value(s) did not match any rows in the key column.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No results yet
  console.log('No results to display');
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Results Yet</CardTitle>
        <CardDescription>
          Run a VLOOKUP search in the Search tab or an update check to see results here.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
