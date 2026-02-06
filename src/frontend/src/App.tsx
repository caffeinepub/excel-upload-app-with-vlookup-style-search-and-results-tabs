import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppStateProvider, useAppState } from './state/appState';
import { AppLayout } from './components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { UploadTab } from './pages/UploadTab';
import { SearchTab } from './pages/SearchTab';
import { ResultsTab } from './pages/ResultsTab';
import { UpdateCheckingTab } from './pages/UpdateCheckingTab';
import { HistoryTab } from './pages/HistoryTab';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 1 minute
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState('upload');
  const { reset } = useAppState();

  const handleFullReset = () => {
    // Clear all app state
    reset();
    // Return to upload tab
    setActiveTab('upload');
  };

  return (
    <AppLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="update-checking">Update Checking</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <UploadTab />
        </TabsContent>
        <TabsContent value="search">
          <SearchTab onSearchComplete={() => setActiveTab('results')} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab onNavigateToUpdateChecking={() => setActiveTab('update-checking')} />
        </TabsContent>
        <TabsContent value="update-checking">
          <UpdateCheckingTab onComparisonComplete={() => setActiveTab('results')} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        {({ reset }) => (
          <AppErrorBoundary onReset={reset}>
            <AppContent />
          </AppErrorBoundary>
        )}
      </AppStateProvider>
    </QueryClientProvider>
  );
}
