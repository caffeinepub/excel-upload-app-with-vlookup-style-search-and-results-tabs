import { useState } from 'react';
import { useAppState } from '../state/appState';
import { useAddHistoryEntry } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { HorizontalTableScroll } from '../components/table/HorizontalTableScroll';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Download, AlertCircle, Edit2, FileSpreadsheet, X } from 'lucide-react';
import { exportToExcel } from '../lib/export/exportXlsx';
import { exportToPdf } from '../lib/export/exportPdf';
import { HistoryType } from '../backend';
import { ResultRowEditModal } from '../components/results/ResultRowEditModal';
import { applyRowEdits } from '../lib/results/applyRowEdits';
import { filterExportRows, getAvailableFilterColumns, getAvailableFilterValues } from '../lib/results/exportFilters';

interface ResultsTabProps {
  onNavigateToUpdateChecking?: () => void;
}

type EditedRowsMap = Map<number, (string | number | boolean | null)[]>;

export function ResultsTab({ onNavigateToUpdateChecking }: ResultsTabProps) {
  const { vlookupResults, filterResults, updateCheckingResults, workbook } = useAppState();
  const addHistory = useAddHistoryEntry();
  const [exporting, setExporting] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<(string | number | boolean | null)[]>([]);
  const [editingRowHeaders, setEditingRowHeaders] = useState<string[]>([]);
  const [editedRows, setEditedRows] = useState<EditedRowsMap>(new Map());

  // Export filter state
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const hasVlookupResults = vlookupResults && vlookupResults.length > 0;
  const hasFilterResults = filterResults && filterResults.filteredRows.length > 0;
  const hasUpdateCheckingResults = updateCheckingResults && updateCheckingResults.rows.length > 0;

  const handleOpenEditModal = (rowIndex: number, currentData: (string | number | boolean | null)[], headers: string[]) => {
    setEditingRowIndex(rowIndex);
    setEditingRowData([...currentData]);
    setEditingRowHeaders(headers);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (editedData: (string | number | boolean | null)[]) => {
    if (editingRowIndex === null) return;
    
    const newEditedRows = new Map(editedRows);
    newEditedRows.set(editingRowIndex, editedData);
    setEditedRows(newEditedRows);
    
    setEditModalOpen(false);
    setEditingRowIndex(null);
    setEditingRowData([]);
    setEditingRowHeaders([]);
  };

  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditingRowIndex(null);
    setEditingRowData([]);
    setEditingRowHeaders([]);
  };

  const handleExportVlookupExcel = async () => {
    if (!hasVlookupResults || !vlookupResults || !workbook || !workbook.sheetData) return;

    setExporting(true);
    try {
      // Get all rows from VLOOKUP results
      const allRows = vlookupResults
        .filter((r) => r.result.found && r.result.fullRow)
        .map((r) => r.result.fullRow!);

      // Apply edits
      const exportRows = applyRowEdits(
        allRows.map(r => r.data),
        editedRows,
        allRows.map(r => r.index)
      );

      // Apply export filter
      const filteredRows = filterExportRows(
        exportRows,
        workbook.sheetData.headers,
        filterColumn,
        filterValue
      );

      await exportToExcel(
        {
          headers: workbook.sheetData.headers,
          rows: filteredRows,
        },
        'crystal-atlas-vlookup-results.xlsx'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} VLOOKUP result(s) to Excel`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportVlookupPdf = async () => {
    if (!hasVlookupResults || !vlookupResults || !workbook || !workbook.sheetData) return;

    setExporting(true);
    try {
      const allRows = vlookupResults
        .filter((r) => r.result.found && r.result.fullRow)
        .map((r) => r.result.fullRow!);

      const exportRows = applyRowEdits(
        allRows.map(r => r.data),
        editedRows,
        allRows.map(r => r.index)
      );

      const filteredRows = filterExportRows(
        exportRows,
        workbook.sheetData.headers,
        filterColumn,
        filterValue
      );

      await exportToPdf(
        {
          headers: workbook.sheetData.headers,
          rows: filteredRows,
        },
        'crystal-atlas-vlookup-results.pdf'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} VLOOKUP result(s) to PDF`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFilterExcel = async () => {
    if (!hasFilterResults || !filterResults) return;

    setExporting(true);
    try {
      const exportRows = applyRowEdits(
        filterResults.filteredRows.map(r => r.data),
        editedRows,
        filterResults.filteredRows.map(r => r.index)
      );

      const filteredRows = filterExportRows(
        exportRows,
        filterResults.headers,
        filterColumn,
        filterValue
      );

      await exportToExcel(
        {
          headers: filterResults.headers,
          rows: filteredRows,
        },
        'crystal-atlas-filter-results.xlsx'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} filter result(s) to Excel`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFilterPdf = async () => {
    if (!hasFilterResults || !filterResults) return;

    setExporting(true);
    try {
      const exportRows = applyRowEdits(
        filterResults.filteredRows.map(r => r.data),
        editedRows,
        filterResults.filteredRows.map(r => r.index)
      );

      const filteredRows = filterExportRows(
        exportRows,
        filterResults.headers,
        filterColumn,
        filterValue
      );

      await exportToPdf(
        {
          headers: filterResults.headers,
          rows: filteredRows,
        },
        'crystal-atlas-filter-results.pdf'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} filter result(s) to PDF`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportUpdateCheckingExcel = async () => {
    if (!hasUpdateCheckingResults || !updateCheckingResults) return;

    setExporting(true);
    try {
      const newRows = updateCheckingResults.rows.filter((row) => row.status === 'new');
      
      const exportRows = applyRowEdits(
        newRows.map(r => r.newData),
        editedRows,
        newRows.map((_, idx) => idx)
      );

      const headers = ['Key', ...updateCheckingResults.headers];
      const rowsWithKey = exportRows.map((row, idx) => [
        String(newRows[idx].keyValue),
        ...row,
      ]);

      const filteredRows = filterExportRows(
        rowsWithKey,
        headers,
        filterColumn,
        filterValue
      );

      await exportToExcel(
        {
          headers,
          rows: filteredRows,
        },
        'crystal-atlas-update-checking-results.xlsx'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} update checking result(s) to Excel`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportUpdateCheckingPdf = async () => {
    if (!hasUpdateCheckingResults || !updateCheckingResults) return;

    setExporting(true);
    try {
      const newRows = updateCheckingResults.rows.filter((row) => row.status === 'new');
      
      const exportRows = applyRowEdits(
        newRows.map(r => r.newData),
        editedRows,
        newRows.map((_, idx) => idx)
      );

      const headers = ['Key', ...updateCheckingResults.headers];
      const rowsWithKey = exportRows.map((row, idx) => [
        String(newRows[idx].keyValue),
        ...row,
      ]);

      const filteredRows = filterExportRows(
        rowsWithKey,
        headers,
        filterColumn,
        filterValue
      );

      await exportToPdf(
        {
          headers,
          rows: filteredRows,
        },
        'crystal-atlas-update-checking-results.pdf'
      );

      addHistory.mutate({
        entryType: HistoryType.results,
        details: `Exported ${filteredRows.length} update checking result(s) to PDF`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilterColumn('');
    setFilterValue('');
  };

  // Get current dataset for filter options
  const getCurrentDataset = (): { headers: string[]; rows: (string | number | boolean | null)[][] } | null => {
    if (hasVlookupResults && vlookupResults && workbook?.sheetData) {
      const allRows = vlookupResults
        .filter((r) => r.result.found && r.result.fullRow)
        .map((r) => r.result.fullRow!.data);
      return { headers: workbook.sheetData.headers, rows: allRows };
    }
    if (hasFilterResults && filterResults) {
      return { headers: filterResults.headers, rows: filterResults.filteredRows.map(r => r.data) };
    }
    if (hasUpdateCheckingResults && updateCheckingResults) {
      const newRows = updateCheckingResults.rows.filter((row) => row.status === 'new');
      const headers = ['Key', ...updateCheckingResults.headers];
      const rows = newRows.map(row => [row.keyValue, ...row.newData]);
      return { headers, rows };
    }
    return null;
  };

  const currentDataset = getCurrentDataset();
  const availableColumns = currentDataset ? getAvailableFilterColumns(currentDataset.headers) : [];
  const availableValues = currentDataset && filterColumn
    ? getAvailableFilterValues(currentDataset.rows, currentDataset.headers, filterColumn)
    : [];

  if (!hasVlookupResults && !hasFilterResults && !hasUpdateCheckingResults) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No results to display. Please perform a search, filter, or update checking operation first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hasUpdateCheckingResults && updateCheckingResults) {
    const newRows = updateCheckingResults.rows.filter((row) => row.status === 'new');

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Update Checking Results</CardTitle>
                  <CardDescription>
                    Found {newRows.length} new item(s) in the updated file
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Filters */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Export Filters</h3>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Column</label>
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Value</label>
                  <Select value={filterValue} onValueChange={setFilterValue} disabled={!filterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableValues.map((val) => (
                        <SelectItem key={val} value={val}>
                          {val}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filterColumn && filterValue && (
                <p className="text-xs text-muted-foreground">
                  Export will include rows where <strong>{filterColumn}</strong> = <strong>{filterValue}</strong>
                </p>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExportUpdateCheckingExcel} disabled={exporting || newRows.length === 0} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download Excel'}
              </Button>
              <Button onClick={handleExportUpdateCheckingPdf} disabled={exporting || newRows.length === 0} size="sm">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download PDF'}
              </Button>
            </div>

            {newRows.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No new items found. All keys in the new file exist in the old file.
                </AlertDescription>
              </Alert>
            ) : (
              <HorizontalTableScroll>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Key</TableHead>
                      {updateCheckingResults.headers.map((header, idx) => (
                        <TableHead key={idx} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newRows.map((row, idx) => {
                      const displayData = editedRows.has(idx) ? editedRows.get(idx)! : row.newData;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {String(row.keyValue)}
                          </TableCell>
                          {displayData.map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="whitespace-nowrap">
                              {cell === null || cell === undefined ? '' : String(cell)}
                            </TableCell>
                          ))}
                          <TableCell className="whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditModal(idx, row.newData, updateCheckingResults.headers)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </HorizontalTableScroll>
            )}
          </CardContent>
        </Card>

        <ResultRowEditModal
          open={editModalOpen}
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          rowData={editingRowData}
          headers={editingRowHeaders}
        />
      </div>
    );
  }

  if (hasVlookupResults && vlookupResults) {
    const matchedCount = vlookupResults.filter((r) => r.result.found).length;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>VLOOKUP Results</CardTitle>
                  <CardDescription>
                    {matchedCount} of {vlookupResults.length} value(s) matched
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Filters */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Export Filters</h3>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Column</label>
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Value</label>
                  <Select value={filterValue} onValueChange={setFilterValue} disabled={!filterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableValues.map((val) => (
                        <SelectItem key={val} value={val}>
                          {val}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filterColumn && filterValue && (
                <p className="text-xs text-muted-foreground">
                  Export will include rows where <strong>{filterColumn}</strong> = <strong>{filterValue}</strong>
                </p>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExportVlookupExcel} disabled={exporting || matchedCount === 0} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download Excel'}
              </Button>
              <Button onClick={handleExportVlookupPdf} disabled={exporting || matchedCount === 0} size="sm">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download PDF'}
              </Button>
            </div>

            <HorizontalTableScroll>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Lookup Value</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    {workbook && workbook.sheetData && workbook.sheetData.headers.map((header, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vlookupResults.map((result, idx) => {
                    const rowIndex = result.result.fullRow?.index;
                    const displayData = rowIndex !== undefined && editedRows.has(rowIndex)
                      ? editedRows.get(rowIndex)!
                      : result.result.fullRow?.data;

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {result.lookupValue}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {result.result.found ? (
                            <Badge variant="default">Match Found</Badge>
                          ) : (
                            <Badge variant="destructive">No Match</Badge>
                          )}
                        </TableCell>
                        {result.result.found && displayData ? (
                          <>
                            {displayData.map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="whitespace-nowrap">
                                {cell === null || cell === undefined ? '' : String(cell)}
                              </TableCell>
                            ))}
                            <TableCell className="whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleOpenEditModal(
                                    result.result.fullRow!.index,
                                    result.result.fullRow!.data,
                                    workbook?.sheetData?.headers || []
                                  )
                                }
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            {workbook && workbook.sheetData &&
                              workbook.sheetData.headers.map((_, cellIdx) => (
                                <TableCell key={cellIdx} className="text-muted-foreground whitespace-nowrap">
                                  -
                                </TableCell>
                              ))}
                            <TableCell className="whitespace-nowrap">-</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </HorizontalTableScroll>
          </CardContent>
        </Card>

        <ResultRowEditModal
          open={editModalOpen}
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          rowData={editingRowData}
          headers={editingRowHeaders}
        />
      </div>
    );
  }

  if (hasFilterResults && filterResults) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Filter Results</CardTitle>
                  <CardDescription>
                    {filterResults.filteredRows.length} row(s) match your filter criteria
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Filters */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Export Filters</h3>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Column</label>
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Filter by Value</label>
                  <Select value={filterValue} onValueChange={setFilterValue} disabled={!filterColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableValues.map((val) => (
                        <SelectItem key={val} value={val}>
                          {val}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filterColumn && filterValue && (
                <p className="text-xs text-muted-foreground">
                  Export will include rows where <strong>{filterColumn}</strong> = <strong>{filterValue}</strong>
                </p>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExportFilterExcel} disabled={exporting || filterResults.filteredRows.length === 0} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download Excel'}
              </Button>
              <Button onClick={handleExportFilterPdf} disabled={exporting || filterResults.filteredRows.length === 0} size="sm">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download PDF'}
              </Button>
            </div>

            <HorizontalTableScroll>
              <Table>
                <TableHeader>
                  <TableRow>
                    {filterResults.headers.map((header, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterResults.filteredRows.map((row, idx) => {
                    const displayData = editedRows.has(row.index) ? editedRows.get(row.index)! : row.data;
                    return (
                      <TableRow key={idx}>
                        {displayData.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="whitespace-nowrap">
                            {cell === null || cell === undefined ? '' : String(cell)}
                          </TableCell>
                        ))}
                        <TableCell className="whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(row.index, row.data, filterResults.headers)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </HorizontalTableScroll>
          </CardContent>
        </Card>

        <ResultRowEditModal
          open={editModalOpen}
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          rowData={editingRowData}
          headers={editingRowHeaders}
        />
      </div>
    );
  }

  return null;
}
