import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAddHistoryEntry } from '../hooks/useQueries';
import { HistoryType } from '../backend';

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

export interface MultiSearchParams {
  lookupValues: string[];
  keyColumn: string;
  returnColumn: string;
  matchType: 'exact' | 'approximate';
}

export interface SearchResult {
  found: boolean;
  value: string | number | boolean | null | (string | number | boolean | null)[];
  rowIndex?: number;
  fullRow?: { index: number; data: (string | number | boolean | null)[] };
  message?: string;
}

export interface VlookupResult {
  lookupValue: string;
  result: SearchResult;
}

export interface FilterResults {
  headers: string[];
  filteredRows: { index: number; data: (string | number | boolean | null)[] }[];
  filterColumn: string;
  filterValue: string;
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
  mode: 'row' | 'column' | 'key-presence';
}

export interface HistoryItem {
  type: 'vlookup' | 'filter' | 'update-checking';
  timestamp: number;
  data: any;
}

interface AppState {
  workbook: WorkbookState | null;
  searchParams: SearchParams | MultiSearchParams | null;
  vlookupResults: VlookupResult[] | null;
  filterResults: FilterResults | null;
  updateCheckingResults: ComparisonResult | null;
  uploadLoading: boolean;
  uploadError: string | null;
  history: HistoryItem[];
  setWorkbook: (workbook: WorkbookState | null) => void;
  replaceWorkbook: (workbook: WorkbookState | null) => void;
  setSearchParams: (params: SearchParams | MultiSearchParams | null) => void;
  setVlookupResults: (results: VlookupResult[] | null) => void;
  setFilterResults: (results: FilterResults | null) => void;
  setUpdateCheckingResults: (results: ComparisonResult | null) => void;
  clearUpdateCheckingResults: () => void;
  setUploadLoading: (loading: boolean) => void;
  setUploadError: (error: string | null) => void;
  addToHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  reset: () => void;
  updateWorkbookCell: (rowIndex: number, colIndex: number, value: string | number | boolean | null) => void;
  updateWorkbookRow: (rowIndex: number, newRow: (string | number | boolean | null)[]) => void;
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

export function AppStateProvider({ children }: { children: ReactNode | ((context: AppState) => ReactNode) }) {
  const [workbook, setWorkbookInternal] = useState<WorkbookState | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | MultiSearchParams | null>(null);
  const [vlookupResults, setVlookupResults] = useState<VlookupResult[] | null>(null);
  const [filterResults, setFilterResults] = useState<FilterResults | null>(null);
  const [updateCheckingResults, setUpdateCheckingResults] = useState<ComparisonResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Backend history mutation
  const addHistoryMutation = useAddHistoryEntry();

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
    setVlookupResults(null);
    setFilterResults(null);
  };

  const clearUpdateCheckingResults = () => {
    setUpdateCheckingResults(null);
  };

  const updateWorkbookCell = (rowIndex: number, colIndex: number, value: string | number | boolean | null) => {
    setWorkbookInternal(prev => {
      if (!prev || !prev.sheetData) return prev;
      
      const newRows = [...prev.sheetData.rows];
      if (rowIndex < 0 || rowIndex >= newRows.length) return prev;
      
      const newRow = [...newRows[rowIndex]];
      if (colIndex < 0 || colIndex >= newRow.length) return prev;
      
      newRow[colIndex] = value;
      newRows[rowIndex] = newRow;
      
      return {
        ...prev,
        sheetData: {
          ...prev.sheetData,
          rows: newRows,
        },
      };
    });
  };

  const updateWorkbookRow = (rowIndex: number, newRow: (string | number | boolean | null)[]) => {
    setWorkbookInternal(prev => {
      if (!prev || !prev.sheetData) return prev;
      
      const newRows = [...prev.sheetData.rows];
      if (rowIndex < 0 || rowIndex >= newRows.length) return prev;
      
      newRows[rowIndex] = [...newRow];
      
      return {
        ...prev,
        sheetData: {
          ...prev.sheetData,
          rows: newRows,
        },
      };
    });
  };

  const addToHistory = (item: HistoryItem) => {
    // Add to local history
    setHistory((prev) => {
      const newHistory = [item, ...prev];
      return newHistory.slice(0, MAX_HISTORY_ITEMS);
    });

    // Try to persist to backend (non-blocking)
    try {
      // Map local history type to backend HistoryType
      let entryType: HistoryType;
      switch (item.type) {
        case 'vlookup':
          entryType = HistoryType.search;
          break;
        case 'filter':
          entryType = HistoryType.search;
          break;
        case 'update-checking':
          entryType = HistoryType.updateChecking;
          break;
        default:
          entryType = HistoryType.search;
      }
      
      const details = JSON.stringify(item.data).substring(0, 500); // Limit details length
      addHistoryMutation.mutate({ entryType, details });
    } catch (error) {
      console.error('Failed to persist history to backend:', error);
      // Continue with local history even if backend fails
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const reset = () => {
    setWorkbookInternal(null);
    setSearchParams(null);
    setVlookupResults(null);
    setFilterResults(null);
    setUpdateCheckingResults(null);
    setUploadLoading(false);
    setUploadError(null);
  };

  const contextValue: AppState = {
    workbook,
    searchParams,
    vlookupResults,
    filterResults,
    updateCheckingResults,
    uploadLoading,
    uploadError,
    history,
    setWorkbook,
    replaceWorkbook,
    setSearchParams,
    setVlookupResults,
    setFilterResults,
    setUpdateCheckingResults,
    clearUpdateCheckingResults,
    setUploadLoading,
    setUploadError,
    addToHistory,
    clearHistory,
    reset,
    updateWorkbookCell,
    updateWorkbookRow,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
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
