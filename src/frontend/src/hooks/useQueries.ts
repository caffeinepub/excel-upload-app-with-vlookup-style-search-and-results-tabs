import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { DataHistoryEntry } from '../backend';

export interface HistoryEntry {
  id?: bigint;
  type: 'vlookup' | 'filter' | 'update-checking';
  timestamp: number;
  data: any;
}

/**
 * Query to list all history entries from the backend
 */
export function useListHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<HistoryEntry[]>({
    queryKey: ['history'],
    queryFn: async () => {
      if (!actor) return [];
      
      try {
        const entries = await actor.listEntries();
        
        // Convert backend entries to frontend format
        return entries.map(([id, entry]) => ({
          id,
          type: determineTypeFromEntry(entry),
          timestamp: Number(entry.filterCount), // Using filterCount as timestamp
          data: convertBackendEntryToFrontendData(entry),
        }));
      } catch (error) {
        console.error('Failed to load history from backend:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Mutation to add a history entry to the backend
 */
export function useAddHistoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }

      const backendEntry = convertFrontendEntryToBackend(entry);
      
      const [id, savedEntry] = await actor.addHistoryEntry(
        backendEntry.determinant,
        backendEntry.diagnosticTestResult,
        backendEntry.dtSensitivityScore,
        backendEntry.filterCount,
        backendEntry.filterLabels,
        backendEntry.indicatorsUsed,
        backendEntry.itemReviewed,
        backendEntry.maintenanceAction,
        backendEntry.manipulatedVariables,
        backendEntry.mpvShortList,
        backendEntry.scoreSummary,
        backendEntry.trueCheck,
        backendEntry.varControlStatus,
        backendEntry.varDefSummary
      );

      return { id, savedEntry };
    },
    onSuccess: () => {
      // Invalidate and refetch history
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error('Failed to add history entry to backend:', error);
    },
  });
}

/**
 * Mutation to clear all history from the backend
 */
export function useClearHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.clearHistory();
    },
    onSuccess: () => {
      // Invalidate and refetch history
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error('Failed to clear history from backend:', error);
    },
  });
}

// Helper functions to convert between frontend and backend formats

function determineTypeFromEntry(entry: DataHistoryEntry): 'vlookup' | 'filter' | 'update-checking' {
  // Use determinant field to store type
  if (entry.determinant === 'vlookup') return 'vlookup';
  if (entry.determinant === 'filter') return 'filter';
  if (entry.determinant === 'update-checking') return 'update-checking';
  return 'vlookup'; // default
}

function convertBackendEntryToFrontendData(entry: DataHistoryEntry): any {
  try {
    // Data is stored as JSON string in itemReviewed field
    return JSON.parse(entry.itemReviewed);
  } catch {
    return {};
  }
}

function convertFrontendEntryToBackend(entry: HistoryEntry): {
  determinant: string;
  diagnosticTestResult: string;
  dtSensitivityScore: bigint;
  filterCount: bigint;
  filterLabels: string[];
  indicatorsUsed: string;
  itemReviewed: string;
  maintenanceAction: string;
  manipulatedVariables: string;
  mpvShortList: string;
  scoreSummary: string;
  trueCheck: boolean;
  varControlStatus: string;
  varDefSummary: string;
} {
  return {
    determinant: entry.type,
    diagnosticTestResult: '',
    dtSensitivityScore: BigInt(0),
    filterCount: BigInt(entry.timestamp),
    filterLabels: [],
    indicatorsUsed: '',
    itemReviewed: JSON.stringify(entry.data),
    maintenanceAction: '',
    manipulatedVariables: '',
    mpvShortList: '',
    scoreSummary: '',
    trueCheck: false,
    varControlStatus: '',
    varDefSummary: '',
  };
}
