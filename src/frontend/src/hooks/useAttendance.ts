import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { AttendanceConfig, AttendanceDayEntry, AttendanceSummary, AttendanceStatus } from '../backend';

/**
 * Query to fetch the current user's attendance configuration
 */
export function useGetAttendanceConfig() {
  const { actor, isFetching } = useActor();

  return useQuery<AttendanceConfig | null>({
    queryKey: ['attendanceConfig'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAttendanceConfig();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Mutation to save/update the current user's attendance configuration
 */
export function useSaveAttendanceConfig() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AttendanceConfig) => {
      if (!identity) {
        throw new Error('Please log in to save attendance settings');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.setAttendanceConfig(config);
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceConfig'] });
    },
    onError: (error) => {
      console.error('Failed to save attendance config:', error);
    },
  });
}

/**
 * Mutation to check in for a specific date
 */
export function useCheckIn() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, status }: { date: string; status: AttendanceStatus }) => {
      if (!identity) {
        throw new Error('Please log in to check in');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.checkIn(date, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
    },
    onError: (error) => {
      console.error('Failed to check in:', error);
    },
  });
}

/**
 * Mutation to check out for a specific date
 */
export function useCheckOut() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!identity) {
        throw new Error('Please log in to check out');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.checkOut(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
    },
    onError: (error) => {
      console.error('Failed to check out:', error);
    },
  });
}

/**
 * Query to fetch attendance summary for a date range
 */
export function useGetAttendanceSummary(range: [string, string]) {
  const { actor, isFetching } = useActor();

  return useQuery<AttendanceSummary>({
    queryKey: ['attendanceSummary', range[0], range[1]],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAttendanceSummary(range);
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Query to fetch a specific attendance entry for a date
 */
export function useGetAttendanceEntry(date: string) {
  const { actor, isFetching } = useActor();

  return useQuery<AttendanceDayEntry | null>({
    queryKey: ['attendanceEntry', date],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAttendanceEntry(date);
    },
    enabled: !!actor && !isFetching && !!date,
    retry: 1,
  });
}

/**
 * Mutation to edit an attendance entry for a specific date
 */
export function useEditAttendanceEntry() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, entry }: { date: string; entry: AttendanceDayEntry }) => {
      if (!identity) {
        throw new Error('Please log in to edit attendance');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.editAttendanceEntry(date, entry);
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific entry and all summaries
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
    },
    onError: (error) => {
      console.error('Failed to edit attendance entry:', error);
    },
  });
}
