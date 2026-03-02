import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useIsCallerAdmin } from './useApproval';
import type { CalendarEvent } from '../backend';

// Re-export CalendarEvent so existing imports from this file still work
export type { CalendarEvent };

export function useGetCalendarEvents() {
  const { actor, isFetching } = useActor();
  const { data: isAdmin } = useIsCallerAdmin();

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents', isAdmin],
    queryFn: async () => {
      if (!actor) return [];
      if (isAdmin) {
        return actor.getAllCalendarEvents();
      }
      return actor.getCalendarEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      dateTime: bigint;
      description: string;
      isAdminOnly: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createCalendarEvent(
        params.title,
        params.dateTime,
        params.description,
        params.isAdminOnly
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCalendarEvent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}
