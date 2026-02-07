import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export interface CalendarEvent {
  id: bigint;
  title: string;
  description: string;
  startTime: bigint;
  endTime?: bigint;
  location?: string;
  participants: string[];
  source: 'user' | 'attendance';
  isDeletable: boolean;
}

/**
 * Query to fetch calendar events
 * Note: Backend doesn't support calendar events yet, returns empty array
 */
export function useGetCalendarEvents() {
  const { actor, isFetching } = useActor();

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      // Backend doesn't support calendar events yet
      return [];
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Mutation to create a calendar event
 * Note: Backend doesn't support calendar events yet
 */
export function useCreateCalendarEvent() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, startTime }: { title: string; description: string; startTime: bigint }) => {
      if (!identity) {
        throw new Error('Please log in to create calendar events');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      // Backend doesn't support calendar events yet
      throw new Error('Calendar events feature is not yet available. Backend support is coming soon.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
    onError: (error) => {
      console.error('Failed to create calendar event:', error);
    },
  });
}

/**
 * Mutation to delete a calendar event
 * Note: Backend doesn't support calendar events yet
 */
export function useDeleteCalendarEvent() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) {
        throw new Error('Please log in to delete calendar events');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      // Backend doesn't support calendar events yet
      throw new Error('Calendar events feature is not yet available. Backend support is coming soon.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
    onError: (error) => {
      console.error('Failed to delete calendar event:', error);
    },
  });
}
