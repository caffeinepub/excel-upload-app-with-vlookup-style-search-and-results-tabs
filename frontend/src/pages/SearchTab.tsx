import { useState } from 'react';
import { useAppState } from '../state/appState';
import { useAddHistoryEntry } from '../hooks/useQueries';
import { vlookup, type MatchType } from '../lib/vlookup/vlookup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Search, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { HistoryType } from '../backend';

interface SearchTabProps {
  onSearchComplete?: () => void;
}

export function SearchTab({ onSearchComplete }: SearchTabProps) {
  const { workbook, setVlookupResults, setFilterResults, clearUpdateCheckingResults } = useAppState();
  const addHistory = useAddHistoryEntry();

  // VLOOKUP state
  const [lookupValues, setLookupValues] = useState('');
  const [keyColumn, setKeyColumn] = useState('');
  const [returnColumns, setReturnColumns] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<MatchType>('exact');
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const handleVlookup = async () => {
    if (!workbook || !workbook.sheetData) return;

    const trimmedValues = lookupValues.trim();
    if (!trimmedValues || !keyColumn || returnColumns.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSearching(true);
    clearUpdateCheckingResults();

    try {
      // Split by comma or newline and trim each value
      const valueList = trimmedValues
        .split(/[,\n]+/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (valueList.length === 0) {
        alert('Please enter at least one lookup value');
        setIsSearching(false);
        return;
      }

      const results = valueList.map((value) => {
        const result = vlookup(
          value,
          workbook.sheetData!,
          keyColumn,
          returnColumns,
          matchType
        );
        return {
          lookupValue: value,
          result,
        };
      });

      setVlookupResults(results);

      // Record history entry for search
      addHistory.mutate({
        entryType: HistoryType.search,
        details: `VLOOKUP search: ${valueList.length} value(s) in column "${keyColumn}", returning ${returnColumns.length} column(s)`,
      });

      onSearchComplete?.();
    } catch (error) {
      console.error('VLOOKUP error:', error);
      alert('An error occurred during VLOOKUP. Please check your inputs and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilter = async () => {
    if (!workbook || !workbook.sheetData) return;

    if (!filterColumn || !filterValue.trim()) {
      alert('Please fill in all filter fields');
      return;
    }

    setIsFiltering(true);

    try {
      const columnIndex = workbook.sheetData.headers.indexOf(filterColumn);
      if (columnIndex === -1) {
        alert('Selected column not found');
        setIsFiltering(false);
        return;
      }

      const filteredRows = workbook.sheetData.rows
        .map((row, index) => ({ index, data: row }))
        .filter(({ data }) => {
          const cellValue = data[columnIndex];
          const cellStr = cellValue === null || cellValue === undefined ? '' : String(cellValue).toLowerCase();
          const filterStr = filterValue.toLowerCase();
          return cellStr.includes(filterStr);
        });

      setFilterResults({
        headers: workbook.sheetData.headers,
        filteredRows,
        filterColumn,
        filterValue,
      });

      // Record history entry for filter
      addHistory.mutate({
        entryType: HistoryType.search,
        details: `Filter data: Column "${filterColumn}" contains "${filterValue}" (${filteredRows.length} result(s))`,
      });

      onSearchComplete?.();
    } catch (error) {
      console.error('Filter error:', error);
      alert('An error occurred during filtering. Please try again.');
    } finally {
      setIsFiltering(false);
    }
  };

  if (!workbook) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please upload an Excel file first to use search features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="vlookup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vlookup">
            <Search className="w-4 h-4 mr-2" />
            VLOOKUP
          </TabsTrigger>
          <TabsTrigger value="filter">
            <Filter className="w-4 h-4 mr-2" />
            Filter Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vlookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VLOOKUP Search</CardTitle>
              <CardDescription>
                Search for multiple values and return matching data from selected columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lookup-values">Lookup Values (comma or newline separated)</Label>
                <Textarea
                  id="lookup-values"
                  placeholder="Enter values to search for, separated by commas or new lines&#10;Example: Value1, Value2&#10;Value3"
                  value={lookupValues}
                  onChange={(e) => setLookupValues(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-column">Key Column (to search in)</Label>
                <Select value={keyColumn} onValueChange={setKeyColumn}>
                  <SelectTrigger id="key-column">
                    <SelectValue placeholder="Select column to search in" />
                  </SelectTrigger>
                  <SelectContent>
                    {workbook.sheetData?.headers.map((header, index) => (
                      <SelectItem key={`key-col-${index}-${header}`} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-columns">Return Columns (select multiple)</Label>
                <Select
                  value={returnColumns[0] || ''}
                  onValueChange={(value) => {
                    if (!returnColumns.includes(value)) {
                      setReturnColumns([...returnColumns, value]);
                    }
                  }}
                >
                  <SelectTrigger id="return-columns">
                    <SelectValue placeholder="Select columns to return" />
                  </SelectTrigger>
                  <SelectContent>
                    {workbook.sheetData?.headers.map((header, index) => (
                      <SelectItem key={`return-col-${index}-${header}`} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {returnColumns.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {returnColumns.map((col) => (
                      <div
                        key={col}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {col}
                        <button
                          onClick={() => setReturnColumns(returnColumns.filter((c) => c !== col))}
                          className="hover:text-primary/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-type">Match Type</Label>
                <Select value={matchType} onValueChange={(value) => setMatchType(value as MatchType)}>
                  <SelectTrigger id="match-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact Match</SelectItem>
                    <SelectItem value="approximate">Approximate Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleVlookup} disabled={isSearching} className="w-full">
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Data</CardTitle>
              <CardDescription>
                Filter rows based on column values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filter-column">Column to Filter</Label>
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger id="filter-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {workbook.sheetData?.headers.map((header, index) => (
                      <SelectItem key={`filter-col-${index}-${header}`} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-value">Filter Value</Label>
                <Input
                  id="filter-value"
                  placeholder="Enter value to filter by"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </div>

              <Button onClick={handleFilter} disabled={isFiltering} className="w-full">
                {isFiltering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Filtering...
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
