import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface SheetData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

export interface WorkbookState {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  sheetData: SheetData | null;
}

export interface SearchParams {
  lookupValue: string;
  keyColumn: string;
  returnColumn: string;
  matchType: 'exact' | 'approximate';
}

export interface SearchResult {
  found: boolean;
  value: string | number | boolean | null;
  rowIndex?: number;
  message?: string;
}

export interface FilterState {
  filterColumn: string;
  filterText: string;
  filteredRows: {
    rowIndex: number;
    data: (string | number | boolean | null)[];
  }[];
}

export interface ComparisonRow {
  status: 'new' | 'updated' | 'unchanged';
  keyValue: string | number | boolean | null;
  oldData?: (string | number | boolean | null)[];
  newData: (string | number | boolean | null)[];
  changedColumns?: number[];
}

export interface ComparisonResult {
  headers: string[];
  rows: ComparisonRow[];
  summary: {
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
  };
  mode: 'row' | 'column';
}

export interface UpdateCheckingState {
  oldWorkbook: WorkbookState | null;
  newWorkbook: WorkbookState | null;
  keyColumn: string;
  comparisonResult: ComparisonResult | null;
}

export interface HistoryItem {
  type: 'vlookup' | 'filter' | 'update-checking';
  timestamp: number;
  data: any;
}

interface AppState {
  workbook: WorkbookState | null;
  searchParams: SearchParams | null;
  searchResult: SearchResult | null;
  filterState: FilterState | null;
  updateCheckingState: UpdateCheckingState;
  uploadLoading: boolean;
  uploadError: string | null;
  history: HistoryItem[];
  setWorkbook: (workbook: WorkbookState | null) => void;
  replaceWorkbook: (workbook: WorkbookState | null) => void;
  setSearchParams: (params: SearchParams | null) => void;
  setSearchResult: (result: SearchResult | null) => void;
  setFilterState: (state: FilterState | null) => void;
  setUpdateCheckingState: (state: Partial<UpdateCheckingState>) => void;
  setUploadLoading: (loading: boolean) => void;
  setUploadError: (error: string | null) => void;
  addToHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  reset: () => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

const HISTORY_STORAGE_KEY = 'crystal-atlas-history';
const MAX_HISTORY_ITEMS = 50;

// Helper to normalize workbook state and ensure selectedSheet is valid and non-empty
function normalizeWorkbook(workbook: WorkbookState | null): WorkbookState | null {
  if (!workbook) return null;
  
  // Filter out any empty sheet names
  const validSheetNames = workbook.sheetNames.filter(name => name && name.trim().length > 0);
  
  if (validSheetNames.length === 0) {
    console.warn('Workbook has no valid sheet names after filtering empty values.');
    return null;
  }
  
  // Ensure selectedSheet is in validSheetNames and not empty
  let selectedSheet = workbook.selectedSheet;
  if (!selectedSheet || !validSheetNames.includes(selectedSheet)) {
    // Fall back to first valid sheet
    selectedSheet = validSheetNames[0];
    console.warn(`Selected sheet "${workbook.selectedSheet}" not found in valid sheet names. Falling back to "${selectedSheet}".`);
  }
  
  return {
    ...workbook,
    sheetNames: validSheetNames,
    selectedSheet: selectedSheet,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [workbook, setWorkbookInternal] = useState<WorkbookState | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [filterState, setFilterState] = useState<FilterState | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [updateCheckingState, setUpdateCheckingStateInternal] = useState<UpdateCheckingState>({
    oldWorkbook: null,
    newWorkbook: null,
    keyColumn: '',
    comparisonResult: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, [history]);

  const setWorkbook = (newWorkbook: WorkbookState | null) => {
    setWorkbookInternal(normalizeWorkbook(newWorkbook));
  };

  const replaceWorkbook = (newWorkbook: WorkbookState | null) => {
    setWorkbookInternal(normalizeWorkbook(newWorkbook));
    // Clear dependent state when workbook is replaced
    setSearchParams(null);
    setSearchResult(null);
    setFilterState(null);
  };

  const setUpdateCheckingState = (partial: Partial<UpdateCheckingState>) => {
    setUpdateCheckingStateInternal((prev) => {
      const updated = { ...prev, ...partial };
      
      // Normalize workbooks in update checking state
      if (partial.oldWorkbook !== undefined) {
        updated.oldWorkbook = normalizeWorkbook(partial.oldWorkbook);
      }
      if (partial.newWorkbook !== undefined) {
        updated.newWorkbook = normalizeWorkbook(partial.newWorkbook);
      }
      
      // Prevent invalid intermediate state: if clearing a workbook, also clear dependent fields
      if (partial.oldWorkbook === null || partial.newWorkbook === null) {
        // When either workbook is cleared, ensure keyColumn and comparisonResult are also cleared
        // unless explicitly set in the partial update
        if (partial.keyColumn === undefined) {
          updated.keyColumn = '';
        }
        if (partial.comparisonResult === undefined) {
          updated.comparisonResult = null;
        }
      }
      
      return updated;
    });
  };

  const addToHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const newHistory = [item, ...prev];
      // Keep only the most recent items
      return newHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const handleSetSearchResult = (result: SearchResult | null) => {
    setSearchResult(result);
    
    // Add to history if result is not null and searchParams exist
    if (result && searchParams && workbook) {
      addToHistory({
        type: 'vlookup',
        timestamp: Date.now(),
        data: {
          searchParams,
          result,
          fileName: workbook.fileName,
        },
      });
    }
  };

  const handleSetFilterState = (state: FilterState | null) => {
    setFilterState(state);
    
    // Add to history if state is not null and has results
    if (state && state.filteredRows.length > 0 && workbook) {
      addToHistory({
        type: 'filter',
        timestamp: Date.now(),
        data: {
          filterColumn: state.filterColumn,
          filterText: state.filterText,
          filteredRows: state.filteredRows,
          headers: workbook.sheetData?.headers || [],
          fileName: workbook.fileName,
        },
      });
    }
  };

  const reset = () => {
    setWorkbookInternal(null);
    setSearchParams(null);
    setSearchResult(null);
    setFilterState(null);
    setUploadLoading(false);
    setUploadError(null);
    setUpdateCheckingStateInternal({
      oldWorkbook: null,
      newWorkbook: null,
      keyColumn: '',
      comparisonResult: null,
    });
  };

  return (
    <AppStateContext.Provider
      value={{
        workbook,
        searchParams,
        searchResult,
        filterState,
        updateCheckingState,
        uploadLoading,
        uploadError,
        history,
        setWorkbook,
        replaceWorkbook,
        setSearchParams,
        setSearchResult: handleSetSearchResult,
        setFilterState: handleSetFilterState,
        setUpdateCheckingState,
        setUploadLoading,
        setUploadError,
        addToHistory,
        clearHistory,
        reset,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
