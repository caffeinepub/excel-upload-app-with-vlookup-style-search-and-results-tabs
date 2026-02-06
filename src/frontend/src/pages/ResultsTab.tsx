import { useAppState } from '../state/appState';
import { performVlookup } from '../lib/vlookup/vlookup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { CheckCircle2, XCircle, RefreshCw, Info, Play, Download, GitCompare } from 'lucide-react';
import { VlookupAnimation } from '../components/vlookup/VlookupAnimation';
import { useState, useMemo } from 'react';
import { exportToExcel } from '../lib/export/exportXlsx';
import { exportToPdf } from '../lib/export/exportPdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UpdateCheckingResultsSearchBar } from '../components/updateChecking/UpdateCheckingResultsSearchBar';
import { filterComparisonRows, MatchType } from '../lib/compare/filterComparisonRows';

interface ResultsTabProps {
  onNavigateToUpdateChecking?: () => void;
}

export function ResultsTab({ onNavigateToUpdateChecking }: ResultsTabProps) {
  const { workbook, searchParams, searchResult, setSearchResult, updateCheckingState } = useAppState();
  const [showAnimation, setShowAnimation] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Search state for Update Checking results
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchMatchType, setSearchMatchType] = useState<MatchType>('contains');

  const handleRerun = () => {
    if (!workbook?.sheetData || !searchParams) {
      alert('Missing workbook or search parameters. Please run a search first.');
      return;
    }
    const result = performVlookup(workbook.sheetData, searchParams);
    setSearchResult(result);
    setShowAnimation(false);
  };

  const handleShowAnimation = () => {
    setShowAnimation(true);
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
  };

  const handleExportVlookupExcel = async () => {
    if (!searchResult || !searchParams) return;

    setExporting(true);
    try {
      await exportToExcel(
        {
          headers: ['Parameter', 'Value'],
          rows: [
            ['Lookup Value', searchParams.lookupValue],
            ['Key Column', searchParams.keyColumn],
            ['Return Column', searchParams.returnColumn],
            ['Match Type', searchParams.matchType],
            ['Result', searchResult.found ? 'Match Found' : 'No Match'],
            ['Returned Value', searchResult.value === null || searchResult.value === undefined ? '(empty)' : String(searchResult.value)],
          ],
        },
        `crystal-atlas-vlookup-${Date.now()}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportVlookupPdf = async () => {
    if (!searchResult || !searchParams) return;

    setExporting(true);
    try {
      await exportToPdf(
        {
          headers: ['Parameter', 'Value'],
          rows: [
            ['Lookup Value', searchParams.lookupValue],
            ['Key Column', searchParams.keyColumn],
            ['Return Column', searchParams.returnColumn],
            ['Match Type', searchParams.matchType],
            ['Result', searchResult.found ? 'Match Found' : 'No Match'],
            ['Returned Value', searchResult.value === null || searchResult.value === undefined ? '(empty)' : String(searchResult.value)],
          ],
        },
        `crystal-atlas-vlookup-${Date.now()}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Filter comparison rows based on search
  const filteredComparisonRows = useMemo(() => {
    if (!updateCheckingState.comparisonResult) return null;
    
    return filterComparisonRows(
      updateCheckingState.comparisonResult.rows,
      searchKeyword,
      searchMatchType,
      updateCheckingState.comparisonResult.headers
    );
  }, [updateCheckingState.comparisonResult, searchKeyword, searchMatchType]);

  const handleExportComparisonExcel = async () => {
    if (!updateCheckingState.comparisonResult || !filteredComparisonRows) return;

    setExporting(true);
    try {
      const result = updateCheckingState.comparisonResult;
      
      if (result.mode === 'row') {
        // Export only filtered new rows
        const rows = filteredComparisonRows.map((row) => [String(row.keyValue), ...row.newData]);
        await exportToExcel(
          {
            headers: ['Key', ...result.headers],
            rows,
          },
          `crystal-atlas-comparison-new-rows-${Date.now()}.xlsx`
        );
      } else {
        // Export filtered rows with change indicators
        const rows = filteredComparisonRows.map((row) => {
          const statusLabel = row.status === 'new' ? 'NEW' : row.status === 'updated' ? 'UPDATED' : 'UNCHANGED';
          const changedColumnsStr = row.changedColumns && row.changedColumns.length > 0 
            ? row.changedColumns.map(idx => result.headers[idx]).join(', ')
            : '-';
          return [
            String(row.keyValue),
            statusLabel,
            changedColumnsStr,
            ...row.newData,
          ];
        });
        
        await exportToExcel(
          {
            headers: ['Key', 'Status', 'Changed Columns', ...result.headers],
            rows,
          },
          `crystal-atlas-comparison-column-diff-${Date.now()}.xlsx`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportComparisonPdf = async () => {
    if (!updateCheckingState.comparisonResult || !filteredComparisonRows) return;

    setExporting(true);
    try {
      const result = updateCheckingState.comparisonResult;
      
      if (result.mode === 'row') {
        // Export only filtered new rows
        const rows = filteredComparisonRows.map((row) => [String(row.keyValue), ...row.newData]);
        await exportToPdf(
          {
            headers: ['Key', ...result.headers],
            rows,
          },
          `crystal-atlas-comparison-new-rows-${Date.now()}.pdf`
        );
      } else {
        // Export filtered rows with change indicators
        const rows = filteredComparisonRows.map((row) => {
          const statusLabel = row.status === 'new' ? 'NEW' : row.status === 'updated' ? 'UPDATED' : 'UNCHANGED';
          const changedColumnsStr = row.changedColumns && row.changedColumns.length > 0 
            ? row.changedColumns.map(idx => result.headers[idx]).join(', ')
            : '-';
          return [
            String(row.keyValue),
            statusLabel,
            changedColumnsStr,
            ...row.newData,
          ];
        });
        
        await exportToPdf(
          {
            headers: ['Key', 'Status', 'Changed Columns', ...result.headers],
            rows,
          },
          `crystal-atlas-comparison-column-diff-${Date.now()}.pdf`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Show comparison results if available
  if (updateCheckingState.comparisonResult && filteredComparisonRows) {
    const result = updateCheckingState.comparisonResult;
    const newRows = filteredComparisonRows.filter(r => r.status === 'new');
    const updatedRows = filteredComparisonRows.filter(r => r.status === 'updated');
    const unchangedRows = filteredComparisonRows.filter(r => r.status === 'unchanged');

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Update Checking Results</CardTitle>
                  <CardDescription>
                    {result.mode === 'row' 
                      ? 'New rows found in the new Excel file'
                      : 'Column-level differences between old and new files'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportComparisonExcel}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  onClick={handleExportComparisonPdf}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                {onNavigateToUpdateChecking && (
                  <Button onClick={onNavigateToUpdateChecking} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{newRows.length}</div>
                <div className="text-sm text-muted-foreground">
                  {searchKeyword ? 'Filtered New Rows' : 'New Rows'}
                </div>
              </div>
              {result.mode === 'column' && (
                <>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{updatedRows.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {searchKeyword ? 'Filtered Updated Rows' : 'Updated Rows'}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{unchangedRows.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {searchKeyword ? 'Filtered Unchanged Rows' : 'Unchanged Rows'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Row Difference Mode: Show only new rows */}
            {result.mode === 'row' && (
              <>
                {newRows.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      New Rows
                    </Label>
                    <ScrollArea className="h-[500px] rounded-md border">
                      <div className="p-4">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b">
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground">
                                Key
                              </th>
                              {result.headers.map((header, idx) => (
                                <th
                                  key={idx}
                                  className="text-left p-2 text-sm font-semibold text-muted-foreground"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {newRows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b hover:bg-muted/50 transition-colors"
                              >
                                <td className="p-2 text-sm font-medium">
                                  {row.keyValue === null || row.keyValue === undefined
                                    ? '-'
                                    : String(row.keyValue)}
                                </td>
                                {row.newData.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="p-2 text-sm">
                                    {cell === null || cell === undefined ? '-' : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {searchKeyword 
                        ? `No rows match your search criteria "${searchKeyword}".`
                        : 'No new rows found. All rows in the new file already exist in the old file.'}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Column Difference Mode: Show all rows with change indicators */}
            {result.mode === 'column' && (
              <div className="space-y-4">
                {/* New Rows */}
                {newRows.length > 0 && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">NEW</Badge>
                      New Rows ({newRows.length})
                    </Label>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b">
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground">Key</th>
                              {result.headers.map((header, idx) => (
                                <th key={idx} className="text-left p-2 text-sm font-semibold text-muted-foreground">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {newRows.map((row, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-2 text-sm font-medium">
                                  {row.keyValue === null || row.keyValue === undefined ? '-' : String(row.keyValue)}
                                </td>
                                {row.newData.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="p-2 text-sm">
                                    {cell === null || cell === undefined ? '-' : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Updated Rows */}
                {updatedRows.length > 0 && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Badge variant="default" className="bg-amber-600">UPDATED</Badge>
                      Updated Rows ({updatedRows.length})
                    </Label>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b">
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground">Key</th>
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground">Changed Columns</th>
                              {result.headers.map((header, idx) => (
                                <th key={idx} className="text-left p-2 text-sm font-semibold text-muted-foreground">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {updatedRows.map((row, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-2 text-sm font-medium">
                                  {row.keyValue === null || row.keyValue === undefined ? '-' : String(row.keyValue)}
                                </td>
                                <td className="p-2 text-xs">
                                  {row.changedColumns && row.changedColumns.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {row.changedColumns.map((colIdx) => (
                                        <Badge key={colIdx} variant="outline" className="text-xs">
                                          {result.headers[colIdx]}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                {row.newData.map((cell, cellIdx) => {
                                  const isChanged = row.changedColumns?.includes(cellIdx);
                                  return (
                                    <td
                                      key={cellIdx}
                                      className={`p-2 text-sm ${isChanged ? 'bg-amber-100 dark:bg-amber-950/30 font-medium' : ''}`}
                                    >
                                      {cell === null || cell === undefined ? '-' : String(cell)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Unchanged Rows */}
                {unchangedRows.length > 0 && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Badge variant="secondary">UNCHANGED</Badge>
                      Unchanged Rows ({unchangedRows.length})
                    </Label>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b">
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground">Key</th>
                              {result.headers.map((header, idx) => (
                                <th key={idx} className="text-left p-2 text-sm font-semibold text-muted-foreground">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {unchangedRows.map((row, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-2 text-sm font-medium">
                                  {row.keyValue === null || row.keyValue === undefined ? '-' : String(row.keyValue)}
                                </td>
                                {row.newData.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="p-2 text-sm text-muted-foreground">
                                    {cell === null || cell === undefined ? '-' : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {filteredComparisonRows.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {searchKeyword 
                        ? `No rows match your search criteria "${searchKeyword}".`
                        : 'No rows to compare. Please check your files and try again.'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show VLOOKUP results
  if (!searchResult) {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {searchResult.found ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive" />
              )}
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResult.found ? 'Match found' : 'No match found'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {searchParams && workbook?.sheetData && (
                <>
                  <Button
                    onClick={handleExportVlookupExcel}
                    disabled={exporting}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    onClick={handleExportVlookupPdf}
                    disabled={exporting}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button onClick={handleShowAnimation} variant="default" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Show Animation
                  </Button>
                  <Button onClick={handleRerun} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-run
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {searchParams && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Search Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Lookup Value:</span>
                  <p className="font-medium">{searchParams.lookupValue}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Match Type:</span>
                  <p className="font-medium capitalize">{searchParams.matchType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Key Column:</span>
                  <p className="font-medium">{searchParams.keyColumn}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Return Column:</span>
                  <p className="font-medium">{searchParams.returnColumn}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Result</h3>
            {searchResult.found ? (
              <div className="p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">{searchResult.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Returned Value:</span>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {searchResult.value === null || searchResult.value === undefined
                          ? '(empty)'
                          : String(searchResult.value)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{searchResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {showAnimation && workbook?.sheetData && searchParams && (
        <VlookupAnimation
          data={workbook.sheetData}
          searchParams={searchParams}
          onClose={() => setShowAnimation(false)}
        />
      )}
    </div>
  );
}
