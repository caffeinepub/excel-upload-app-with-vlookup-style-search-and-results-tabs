import { useState } from 'react';
import { AppStateProvider, useAppState } from './state/appState';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { UploadTab } from './pages/UploadTab';
import { SearchTab } from './pages/SearchTab';
import { ResultsTab } from './pages/ResultsTab';
import { UpdateCheckingTab } from './pages/UpdateCheckingTab';
import { HistoryTab } from './pages/HistoryTab';

function AppContent() {
  const [activeTab, setActiveTab] = useState('upload');
  const { reset } = useAppState();

  return (
    <AppErrorBoundary reset={reset}>
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
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
