import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

export interface HistoryEntry {
  id?: bigint;
  type: 'vlookup' | 'filter' | 'update-checking';
  timestamp: number;
  data: any;
}

/**
 * Query to list all history entries - now returns empty array since backend no longer supports history
 * History is managed locally in app state
 */
export function useListHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<HistoryEntry[]>({
    queryKey: ['history'],
    queryFn: async () => {
      // Backend no longer supports history, return empty array
      // History is now managed locally in app state
      return [];
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Mutation to add a history entry - now a no-op since backend no longer supports history
 * History is managed locally in app state
 */
export function useAddHistoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      // Backend no longer supports history
      // History is now managed locally in app state
      return { id: BigInt(0), savedEntry: entry };
    },
    onSuccess: () => {
      // Invalidate and refetch history
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error('Failed to add history entry:', error);
    },
  });
}

/**
 * Mutation to clear all history - now a no-op since backend no longer supports history
 * History is managed locally in app state
 */
export function useClearHistory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Backend no longer supports history
      // History is now managed locally in app state
      return;
    },
    onSuccess: () => {
      // Invalidate and refetch history
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error('Failed to clear history:', error);
    },
  });
}
