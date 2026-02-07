import { useState } from 'react';
import { useListHistory, useClearHistory } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { History, Search, Filter, GitCompare, Trash2, Clock, AlertCircle, Loader2, Upload, FileText, Wallet, Download, FileSpreadsheet } from 'lucide-react';
import { HistoryType } from '../backend';
import { exportHistoryToExcel, exportHistoryToPdf } from '../lib/results/historyExport';

export function HistoryTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: history = [], isLoading, error } = useListHistory();
  const clearHistoryMutation = useClearHistory();
  
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filter history by type and keyword
  const filteredHistory = history.filter((item) => {
    // Filter by type
    if (selectedType !== 'all' && item.entryType !== selectedType) {
      return false;
    }
    // Filter by keyword (search in details)
    if (searchKeyword.trim() && !item.details.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group by type
  const uploadHistory = history.filter((item) => item.entryType === HistoryType.upload);
  const searchHistory = history.filter((item) => item.entryType === HistoryType.search);
  const resultsHistory = history.filter((item) => item.entryType === HistoryType.results);
  const updateCheckingHistory = history.filter((item) => item.entryType === HistoryType.updateChecking);
  const budgetHistory = history.filter((item) => item.entryType === HistoryType.budgetChange);
  const expenseHistory = history.filter((item) => item.entryType === HistoryType.expenseChange);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case HistoryType.upload:
        return <Upload className="w-4 h-4" />;
      case HistoryType.search:
        return <Search className="w-4 h-4" />;
      case HistoryType.results:
        return <FileText className="w-4 h-4" />;
      case HistoryType.updateChecking:
        return <GitCompare className="w-4 h-4" />;
      case HistoryType.budgetChange:
        return <Wallet className="w-4 h-4" />;
      case HistoryType.expenseChange:
        return <Wallet className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case HistoryType.upload:
        return 'default';
      case HistoryType.search:
        return 'secondary';
      case HistoryType.results:
        return 'outline';
      case HistoryType.updateChecking:
        return 'default';
      case HistoryType.budgetChange:
        return 'secondary';
      case HistoryType.expenseChange:
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case HistoryType.upload:
        return 'Upload';
      case HistoryType.search:
        return 'Search';
      case HistoryType.results:
        return 'Results';
      case HistoryType.updateChecking:
        return 'Update Checking';
      case HistoryType.budgetChange:
        return 'Budget';
      case HistoryType.expenseChange:
        return 'Expense';
      default:
        return type;
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      return;
    }
    try {
      await clearHistoryMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history. Please try again.');
    }
  };

  const handleExportExcel = async () => {
    if (filteredHistory.length === 0) return;
    
    setExporting(true);
    try {
      await exportHistoryToExcel(filteredHistory, formatDate);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (filteredHistory.length === 0) return;
    
    setExporting(true);
    try {
      await exportHistoryToPdf(filteredHistory, formatDate);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">History</h2>
          <p className="text-muted-foreground">View your activity history</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your history.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card className="history-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div>
              <CardTitle>Loading History</CardTitle>
              <CardDescription>Fetching your history from the backend...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="history-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <div>
              <CardTitle>History Error</CardTitle>
              <CardDescription>Failed to load history from backend</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load history from the backend. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="history-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-xl sm:text-2xl">Activity History</CardTitle>
                <CardDescription className="text-xs sm:text-sm break-words">
                  View and filter your activity across all features
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={exporting || filteredHistory.length === 0}
                className="flex-shrink-0"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Download Excel
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={exporting || filteredHistory.length === 0}
                className="flex-shrink-0"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={clearHistoryMutation.isPending || history.length === 0}
                className="flex-shrink-0"
              >
                {clearHistoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={HistoryType.upload}>Upload</SelectItem>
                  <SelectItem value={HistoryType.search}>Search</SelectItem>
                  <SelectItem value={HistoryType.results}>Results</SelectItem>
                  <SelectItem value={HistoryType.updateChecking}>Update Checking</SelectItem>
                  <SelectItem value={HistoryType.budgetChange}>Budget</SelectItem>
                  <SelectItem value={HistoryType.expenseChange}>Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Details</label>
              <Input
                placeholder="Search in details..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg sm:text-xl font-semibold text-emerald-600 dark:text-emerald-400">{history.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Upload</p>
              <p className="text-lg sm:text-xl font-semibold">{uploadHistory.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Search</p>
              <p className="text-lg sm:text-xl font-semibold">{searchHistory.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Results</p>
              <p className="text-lg sm:text-xl font-semibold">{resultsHistory.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Update</p>
              <p className="text-lg sm:text-xl font-semibold">{updateCheckingHistory.length}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Budget/Exp</p>
              <p className="text-lg sm:text-xl font-semibold">{budgetHistory.length + expenseHistory.length}</p>
            </div>
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {history.length === 0 ? (
                <>
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No history entries yet. Start using the app to see your activity here.</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No entries match your filters. Try adjusting your search criteria.</p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {filteredHistory.map((entry) => (
                  <div
                    key={Number(entry.id)}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors history-item"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(entry.entryType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={getTypeBadgeVariant(entry.entryType)} className="history-badge">
                            {getTypeLabel(entry.entryType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm break-words">{entry.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Card className="history-card">
        <CardHeader>
          <CardTitle>View by Category</CardTitle>
          <CardDescription>Browse history entries grouped by function type</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-1">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
              <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
              <TabsTrigger value="results" className="text-xs">Results</TabsTrigger>
              <TabsTrigger value="update" className="text-xs">Update</TabsTrigger>
              <TabsTrigger value="budget" className="text-xs">Budget</TabsTrigger>
              <TabsTrigger value="expense" className="text-xs">Expense</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No history entries</p>
                  ) : (
                    history.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getTypeBadgeVariant(entry.entryType)} className="text-xs history-badge">
                            {getTypeLabel(entry.entryType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
                        </div>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {uploadHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No upload history</p>
                  ) : (
                    uploadHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="search" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {searchHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No search history</p>
                  ) : (
                    searchHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="results" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {resultsHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No results history</p>
                  ) : (
                    resultsHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="update" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {updateCheckingHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No update checking history</p>
                  ) : (
                    updateCheckingHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="budget" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {budgetHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No budget history</p>
                  ) : (
                    budgetHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="expense" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {expenseHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No expense history</p>
                  ) : (
                    expenseHistory.map((entry) => (
                      <div key={Number(entry.id)} className="p-3 border rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.timestamp)}</p>
                        <p className="break-words">{entry.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
