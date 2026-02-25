import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { HistoryEntry, HistoryType } from '../backend';

/**
 * Query to list all history entries from backend
 */
export function useListHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<HistoryEntry[]>({
    queryKey: ['history'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getHistory();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
    retry: 2,
  });
}

/**
 * Query to get filtered history by type (client-side filter since backend has no getFilteredHistory)
 */
export function useGetFilteredHistory(historyType: HistoryType | null) {
  const { actor, isFetching } = useActor();

  return useQuery<HistoryEntry[]>({
    queryKey: ['history', 'filtered', historyType],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const all = await actor.getHistory();
      if (!historyType) return all;
      return all.filter((entry) => entry.entryType === historyType);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
    retry: 2,
  });
}

/**
 * Mutation to add a history entry
 */
export function useAddHistoryEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryType, details }: { entryType: HistoryType; details: string }) => {
      if (!actor) throw new Error('Actor not available');
      const id = await actor.addHistory(entryType, details);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error) => {
      console.error('Failed to add history entry:', error);
    },
  });
}

/**
 * Mutation to clear all history (no backend clearHistory; this is a no-op placeholder)
 */
export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Backend does not expose a clearHistory method.
      // This is intentionally a no-op to avoid breaking callers.
      console.warn('clearHistory is not supported by the backend.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
