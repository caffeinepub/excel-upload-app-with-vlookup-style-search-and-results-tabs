import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { HolidayEntry, HolidayType } from '../backend';

/**
 * Query to fetch all global holidays
 */
export function useGetAllHolidays() {
  const { actor, isFetching } = useActor();

  return useQuery<HolidayEntry[]>({
    queryKey: ['holidays'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllHolidays();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Query to check if the current user is an admin
 */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: 1,
  });
}

/**
 * Mutation to create a new holiday
 */
export function useCreateHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, holidayType }: { date: string; holidayType: HolidayType }) => {
      if (!identity) {
        throw new Error('Please log in to manage holidays');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.createHoliday(date, holidayType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
    },
    onError: (error) => {
      console.error('Failed to create holiday:', error);
    },
  });
}

/**
 * Mutation to update an existing holiday
 */
export function useUpdateHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, holidayType }: { date: string; holidayType: HolidayType }) => {
      if (!identity) {
        throw new Error('Please log in to manage holidays');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.updateHoliday(date, holidayType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
    },
    onError: (error) => {
      console.error('Failed to update holiday:', error);
    },
  });
}

/**
 * Mutation to delete a holiday
 */
export function useDeleteHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!identity) {
        throw new Error('Please log in to manage holidays');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.deleteHoliday(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
    },
    onError: (error) => {
      console.error('Failed to delete holiday:', error);
    },
  });
}
