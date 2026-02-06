import { useAppState } from '../state/appState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, Filter, GitCompare, Download, Trash2, Clock } from 'lucide-react';
import { exportToExcel } from '../lib/export/exportXlsx';
import { exportToPdf } from '../lib/export/exportPdf';
import { useState } from 'react';

export function HistoryTab() {
  const { history, clearHistory } = useAppState();
  const [exporting, setExporting] = useState(false);

  const vlookupHistory = history.filter((item) => item.type === 'vlookup');
  const filterHistory = history.filter((item) => item.type === 'filter');
  const updateCheckingHistory = history.filter((item) => item.type === 'update-checking');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleExportVlookup = async (item: any) => {
    setExporting(true);
    try {
      await exportToExcel(
        {
          headers: ['Parameter', 'Value'],
          rows: [
            ['Lookup Value', item.data.searchParams.lookupValue],
            ['Key Column', item.data.searchParams.keyColumn],
            ['Return Column', item.data.searchParams.returnColumn],
            ['Match Type', item.data.searchParams.matchType],
            ['Result', item.data.result.found ? 'Match Found' : 'No Match'],
            ['Returned Value', item.data.result.value === null || item.data.result.value === undefined ? '(empty)' : String(item.data.result.value)],
            ['Timestamp', formatDate(item.timestamp)],
          ],
        },
        `crystal-atlas-vlookup-history-${item.timestamp}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportVlookupPdf = async (item: any) => {
    setExporting(true);
    try {
      await exportToPdf(
        {
          headers: ['Parameter', 'Value'],
          rows: [
            ['Lookup Value', item.data.searchParams.lookupValue],
            ['Key Column', item.data.searchParams.keyColumn],
            ['Return Column', item.data.searchParams.returnColumn],
            ['Match Type', item.data.searchParams.matchType],
            ['Result', item.data.result.found ? 'Match Found' : 'No Match'],
            ['Returned Value', item.data.result.value === null || item.data.result.value === undefined ? '(empty)' : String(item.data.result.value)],
            ['Timestamp', formatDate(item.timestamp)],
          ],
        },
        `crystal-atlas-vlookup-history-${item.timestamp}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFilter = async (item: any) => {
    setExporting(true);
    try {
      await exportToExcel(
        {
          headers: item.data.headers,
          rows: item.data.filteredRows.map((row: any) => row.data),
        },
        `crystal-atlas-filter-history-${item.timestamp}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFilterPdf = async (item: any) => {
    setExporting(true);
    try {
      await exportToPdf(
        {
          headers: item.data.headers,
          rows: item.data.filteredRows.map((row: any) => row.data),
        },
        `crystal-atlas-filter-history-${item.timestamp}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportComparison = async (item: any) => {
    setExporting(true);
    try {
      const result = item.data.result;
      const rows = result.rows.map((row: any) => [String(row.keyValue), ...row.newData]);

      await exportToExcel(
        {
          headers: ['Key', ...result.headers],
          rows,
        },
        `crystal-atlas-comparison-history-${item.timestamp}.xlsx`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportComparisonPdf = async (item: any) => {
    setExporting(true);
    try {
      const result = item.data.result;
      const rows = result.rows.map((row: any) => [String(row.keyValue), ...row.newData]);

      await exportToPdf(
        {
          headers: ['Key', ...result.headers],
          rows,
        },
        `crystal-atlas-comparison-history-${item.timestamp}.pdf`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>History</CardTitle>
                <CardDescription>
                  View and export your previous searches, filters, and comparisons
                </CardDescription>
              </div>
            </div>
            {history.length > 0 && (
              <Button onClick={clearHistory} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No history yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your searches, filters, and comparisons will appear here
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({history.length})</TabsTrigger>
                <TabsTrigger value="vlookup">VLOOKUP ({vlookupHistory.length})</TabsTrigger>
                <TabsTrigger value="filter">Filter ({filterHistory.length})</TabsTrigger>
                <TabsTrigger value="update">Update ({updateCheckingHistory.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {history.map((item, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.type === 'vlookup' && <Search className="w-5 h-5 text-primary" />}
                              {item.type === 'filter' && <Filter className="w-5 h-5 text-primary" />}
                              {item.type === 'update-checking' && <GitCompare className="w-5 h-5 text-primary" />}
                              <div>
                                <CardTitle className="text-base">
                                  {item.type === 'vlookup' && 'VLOOKUP Search'}
                                  {item.type === 'filter' && 'Filter Data'}
                                  {item.type === 'update-checking' && 'Update Checking'}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {formatDate(item.timestamp)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {item.type === 'vlookup' && (
                                <>
                                  <Button
                                    onClick={() => handleExportVlookup(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                  </Button>
                                  <Button
                                    onClick={() => handleExportVlookupPdf(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </Button>
                                </>
                              )}
                              {item.type === 'filter' && (
                                <>
                                  <Button
                                    onClick={() => handleExportFilter(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                  </Button>
                                  <Button
                                    onClick={() => handleExportFilterPdf(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </Button>
                                </>
                              )}
                              {item.type === 'update-checking' && (
                                <>
                                  <Button
                                    onClick={() => handleExportComparison(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                  </Button>
                                  <Button
                                    onClick={() => handleExportComparisonPdf(item)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {item.type === 'vlookup' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Lookup Value:</span>
                                <span className="font-medium">{item.data.searchParams.lookupValue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Result:</span>
                                <Badge variant={item.data.result.found ? 'default' : 'secondary'}>
                                  {item.data.result.found ? 'Match Found' : 'No Match'}
                                </Badge>
                              </div>
                            </div>
                          )}
                          {item.type === 'filter' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Column:</span>
                                <span className="font-medium">{item.data.filterColumn}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Search Text:</span>
                                <span className="font-medium">{item.data.filterText}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Matches:</span>
                                <Badge variant="secondary">{item.data.filteredRows.length}</Badge>
                              </div>
                            </div>
                          )}
                          {item.type === 'update-checking' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Old File:</span>
                                <span className="font-medium">{item.data.oldFileName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">New File:</span>
                                <span className="font-medium">{item.data.newFileName}</span>
                              </div>
                              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded mt-3 text-center">
                                <div className="font-bold text-green-600">{item.data.result.summary.newCount}</div>
                                <div className="text-xs text-muted-foreground">New Rows</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="vlookup" className="mt-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {vlookupHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No VLOOKUP history</p>
                      </div>
                    ) : (
                      vlookupHistory.map((item, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Search className="w-5 h-5 text-primary" />
                                <div>
                                  <CardTitle className="text-base">VLOOKUP Search</CardTitle>
                                  <CardDescription className="text-xs">
                                    {formatDate(item.timestamp)}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleExportVlookup(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Excel
                                </Button>
                                <Button
                                  onClick={() => handleExportVlookupPdf(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Lookup Value:</span>
                                <span className="font-medium">{item.data.searchParams.lookupValue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Key Column:</span>
                                <span className="font-medium">{item.data.searchParams.keyColumn}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Return Column:</span>
                                <span className="font-medium">{item.data.searchParams.returnColumn}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Result:</span>
                                <Badge variant={item.data.result.found ? 'default' : 'secondary'}>
                                  {item.data.result.found ? 'Match Found' : 'No Match'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="filter" className="mt-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filterHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No filter history</p>
                      </div>
                    ) : (
                      filterHistory.map((item, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Filter className="w-5 h-5 text-primary" />
                                <div>
                                  <CardTitle className="text-base">Filter Data</CardTitle>
                                  <CardDescription className="text-xs">
                                    {formatDate(item.timestamp)}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleExportFilter(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Excel
                                </Button>
                                <Button
                                  onClick={() => handleExportFilterPdf(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Column:</span>
                                <span className="font-medium">{item.data.filterColumn}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Search Text:</span>
                                <span className="font-medium">{item.data.filterText}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Matches:</span>
                                <Badge variant="secondary">{item.data.filteredRows.length}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="update" className="mt-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {updateCheckingHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No update checking history</p>
                      </div>
                    ) : (
                      updateCheckingHistory.map((item, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GitCompare className="w-5 h-5 text-primary" />
                                <div>
                                  <CardTitle className="text-base">Update Checking</CardTitle>
                                  <CardDescription className="text-xs">
                                    {formatDate(item.timestamp)}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleExportComparison(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Excel
                                </Button>
                                <Button
                                  onClick={() => handleExportComparisonPdf(item)}
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Old File:</span>
                                <span className="font-medium">{item.data.oldFileName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">New File:</span>
                                <span className="font-medium">{item.data.newFileName}</span>
                              </div>
                              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded mt-3 text-center">
                                <div className="font-bold text-green-600">{item.data.result.summary.newCount}</div>
                                <div className="text-xs text-muted-foreground">New Rows</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
