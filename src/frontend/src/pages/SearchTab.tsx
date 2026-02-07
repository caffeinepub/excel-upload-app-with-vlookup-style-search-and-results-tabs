import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { performMultiVlookup } from '../lib/vlookup/vlookup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Search, AlertCircle, Info, Filter, Table2, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HorizontalTableScroll } from '../components/table/HorizontalTableScroll';
import { exportToExcel } from '../lib/export/exportXlsx';
import { exportToPdf } from '../lib/export/exportPdf';

interface SearchTabProps {
  onSearchComplete?: () => void;
}

interface FilteredRow {
  rowIndex: number;
  data: (string | number | boolean | null)[];
}

export function SearchTab({ onSearchComplete }: SearchTabProps) {
  const { workbook, searchParams, setSearchParams, setSearchResult, setFilterState } = useAppState();
  const [lookupValue, setLookupValue] = useState('');
  const [keyColumn, setKeyColumn] = useState('');
  const [returnColumn, setReturnColumn] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'approximate'>('exact');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // New search/filter state
  const [searchMode, setSearchMode] = useState<'vlookup' | 'filter'>('vlookup');
  const [filterText, setFilterText] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [exporting, setExporting] = useState(false);

  // Load previous search params
  useEffect(() => {
    if (searchParams) {
      // Handle both single and multi search params
      if ('lookupValue' in searchParams) {
        setLookupValue(searchParams.lookupValue);
        setKeyColumn(searchParams.keyColumn);
        setReturnColumn(searchParams.returnColumn);
        setMatchType(searchParams.matchType);
      } else if ('lookupValues' in searchParams) {
        setLookupValue(searchParams.lookupValues.join('\n'));
        setKeyColumn(searchParams.keyColumn);
        setReturnColumn(searchParams.returnColumn);
        setMatchType(searchParams.matchType);
      }
    }
  }, [searchParams]);

  // Reset column selections when workbook changes
  useEffect(() => {
    if (workbook?.sheetData) {
      const headers = workbook.sheetData.headers.filter((h) => h.trim() !== '');
      
      // Validate and reset keyColumn if it's not in current headers
      if (keyColumn && !headers.includes(keyColumn)) {
        setKeyColumn('');
      }
      
      // Validate and reset returnColumn if it's not in current headers
      if (returnColumn && !headers.includes(returnColumn)) {
        setReturnColumn('');
      }
      
      // Validate and reset filterColumn if it's not in current headers
      if (filterColumn && !headers.includes(filterColumn)) {
        setFilterColumn('');
        setFilterText('');
      }
    }
  }, [workbook?.selectedSheet, workbook?.sheetData]);

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!workbook?.sheetData || !filterText.trim() || !filterColumn) {
      return [];
    }

    const colIndex = workbook.sheetData.headers.indexOf(filterColumn);
    if (colIndex === -1) return [];

    const searchTerm = filterText.toLowerCase().trim();
    const results: FilteredRow[] = [];

    workbook.sheetData.rows.forEach((row, index) => {
      const cellValue = row[colIndex];
      if (cellValue !== null && cellValue !== undefined) {
        const cellStr = String(cellValue).toLowerCase();
        if (cellStr.includes(searchTerm)) {
          results.push({ rowIndex: index, data: row });
        }
      }
    });

    return results;
  }, [workbook?.sheetData, filterText, filterColumn]);

  // Update filter state when filtered data changes
  useEffect(() => {
    if (filterColumn && filterText && filteredData.length > 0) {
      setFilterState({
        filterColumn,
        filterText,
        filteredRows: filteredData,
      });
    } else {
      setFilterState(null);
    }
  }, [filterColumn, filterText, filteredData, setFilterState]);

  const handleSearch = () => {
    console.log('VLOOKUP Search initiated');
    setError(null);
    setIsSearching(true);

    try {
      if (!workbook || !workbook.sheetData) {
        setError('Please upload an Excel file and select a sheet first.');
        setIsSearching(false);
        return;
      }

      if (!lookupValue.trim()) {
        setError('Please enter a lookup value.');
        setIsSearching(false);
        return;
      }

      if (!keyColumn) {
        setError('Please select a key column.');
        setIsSearching(false);
        return;
      }

      if (!returnColumn) {
        setError('Please select a return column.');
        setIsSearching(false);
        return;
      }

      // Parse lookup values (comma or newline separated)
      const rawValues = lookupValue.split(/[\n,]+/).map(v => v.trim()).filter(v => v.length > 0);
      
      if (rawValues.length === 0) {
        setError('Please enter at least one valid lookup value.');
        setIsSearching(false);
        return;
      }

      const params = { lookupValues: rawValues, keyColumn, returnColumn, matchType };
      console.log('Multi-VLOOKUP params:', params);
      
      setSearchParams(params);

      const result = performMultiVlookup(workbook.sheetData, params);
      console.log('Multi-VLOOKUP result:', result);
      
      // This will clear update checking results and set VLOOKUP results
      setSearchResult(result);

      // Navigate to results tab after search completes
      if (onSearchComplete) {
        console.log('Navigating to results tab');
        onSearchComplete();
      }
    } catch (err) {
      console.error('VLOOKUP search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportFilteredExcel = async () => {
    if (!workbook?.sheetData || filteredData.length === 0) return;

    setExporting(true);
    try {
      await exportToExcel(
        {
          headers: workbook.sheetData.headers,
          rows: filteredData.map((item) => item.data),
        },
        `crystal-atlas-filtered-${filterColumn}-${Date.now()}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFilteredPdf = async () => {
    if (!workbook?.sheetData || filteredData.length === 0) return;

    setExporting(true);
    try {
      await exportToPdf(
        {
          headers: workbook.sheetData.headers,
          rows: filteredData.map((item) => item.data),
        },
        `crystal-atlas-filtered-${filterColumn}-${Date.now()}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!workbook || !workbook.sheetData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Loaded</CardTitle>
          <CardDescription>Please upload an Excel file in the Upload tab first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const columns = workbook.sheetData.headers.filter((h) => h.trim() !== '');
  
  // Guard Select values to ensure they're in the available columns
  const safeKeyColumn = keyColumn && columns.includes(keyColumn) ? keyColumn : '';
  const safeReturnColumn = returnColumn && columns.includes(returnColumn) ? returnColumn : '';
  const safeFilterColumn = filterColumn && columns.includes(filterColumn) ? filterColumn : '';

  return (
    <div className="space-y-6">
      <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vlookup" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            VLOOKUP Search
          </TabsTrigger>
          <TabsTrigger value="filter" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vlookup" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Search className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>VLOOKUP Search</CardTitle>
                  <CardDescription>
                    Enter multiple lookup values (comma or newline separated) to find matching data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="lookup-value">Lookup Values (one per line or comma-separated)</Label>
                <Textarea
                  id="lookup-value"
                  placeholder="Enter values to search for...&#10;Example:&#10;A12&#10;B34, C56&#10;D78"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                  rows={5}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: You can paste multiple values separated by commas or new lines
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key-column">Key Column (Search In)</Label>
                  <Select value={safeKeyColumn} onValueChange={setKeyColumn}>
                    <SelectTrigger id="key-column">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="return-column">Return Column (Get Value From)</Label>
                  <Select value={safeReturnColumn} onValueChange={setReturnColumn}>
                    <SelectTrigger id="return-column">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Match Type</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          <strong>Exact:</strong> Finds the first row where the key column exactly matches
                          the lookup value.
                        </p>
                        <p className="text-sm mt-2">
                          <strong>Approximate:</strong> Finds the largest value less than or equal to the
                          lookup value. Requires numeric values in the key column.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exact" id="exact" />
                    <Label htmlFor="exact" className="font-normal cursor-pointer">
                      Exact Match
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approximate" id="approximate" />
                    <Label htmlFor="approximate" className="font-normal cursor-pointer">
                      Approximate Match
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSearch} 
                className="w-full" 
                size="lg"
                disabled={isSearching || !lookupValue.trim() || !keyColumn || !returnColumn}
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Run VLOOKUP'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filter" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Filter & Search Data</CardTitle>
                  <CardDescription>
                    Search and filter data across your tables in real-time
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-column">Search Column</Label>
                  <Select value={safeFilterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger id="filter-column">
                      <SelectValue placeholder="Select column to search..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-text">Search Text</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="filter-text"
                      placeholder="Type to search..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="pl-10"
                      rows={1}
                    />
                  </div>
                </div>
              </div>

              {filterColumn && filterText && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Table2 className="w-4 h-4" />
                      Filtered Results
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {filteredData.length} {filteredData.length === 1 ? 'match' : 'matches'}
                      </Badge>
                      {filteredData.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleExportFilteredExcel}
                            disabled={exporting}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                          </Button>
                          <Button
                            onClick={handleExportFilteredPdf}
                            disabled={exporting}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {filteredData.length > 0 ? (
                    <ScrollArea className="h-[400px] rounded-md border">
                      <HorizontalTableScroll className="p-4">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b">
                              <th className="text-left p-2 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                                Row
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
                            {filteredData.map((item, idx) => (
                              <tr
                                key={idx}
                                className="border-b hover:bg-muted/50 transition-colors"
                              >
                                <td className="p-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
                                  {item.rowIndex + 2}
                                </td>
                                {item.data.map((cell, cellIdx) => {
                                  const isFilterColumn =
                                    workbook.sheetData!.headers[cellIdx] === filterColumn;
                                  return (
                                    <td
                                      key={cellIdx}
                                      className={`p-2 text-sm whitespace-nowrap ${
                                        isFilterColumn
                                          ? 'font-semibold bg-primary/10'
                                          : ''
                                      }`}
                                    >
                                      {cell === null || cell === undefined
                                        ? '-'
                                        : String(cell)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </HorizontalTableScroll>
                    </ScrollArea>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No matches found for "{filterText}" in column "{filterColumn}"
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {(!filterColumn || !filterText) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select a column and enter search text to filter the data
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
