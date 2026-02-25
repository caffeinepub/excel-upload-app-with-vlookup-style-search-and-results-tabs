import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { AttendanceConfig, AttendanceDayEntry, AttendanceSummary } from '../backend';
import { AttendanceStatus } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

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
      if (!identity) throw new Error('Please log in to save attendance settings');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');
      await actor.saveAttendanceConfig(config);
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
 * Mutation to save an attendance entry for a specific date (check-in equivalent)
 */
export function useCheckIn() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, status }: { date: string; status: AttendanceStatus }) => {
      if (!identity) throw new Error('Please log in to check in');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');

      const now = BigInt(Date.now()) * BigInt(1_000_000); // ms to ns
      const entry: AttendanceDayEntry = {
        status,
        checkIn: now,
        checkOut: undefined,
        note: '',
        workingTime: BigInt(0),
      };
      await actor.saveAttendanceEntry(date, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
    },
    onError: (error) => {
      console.error('Failed to check in:', error);
    },
  });
}

/**
 * Mutation to check in for today with work brief
 */
export function useTodayCheckIn() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      status,
      workBrief,
    }: {
      date: string;
      status: AttendanceStatus;
      workBrief: string;
    }) => {
      if (!identity) throw new Error('Please log in to check in');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');

      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const entry: AttendanceDayEntry = {
        status,
        checkIn: now,
        checkOut: undefined,
        note: workBrief,
        workingTime: BigInt(0),
      };
      await actor.saveAttendanceEntry(date, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
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
    mutationFn: async ({ date, note }: { date: string; note?: string }) => {
      if (!identity) throw new Error('Please log in to check out');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');

      // Fetch existing entry to preserve check-in time and compute working time
      const entries = await actor.getAttendanceEntries();
      const existing = entries.find(([d]) => d === date)?.[1];

      const now = BigInt(Date.now()) * BigInt(1_000_000);
      let workingTime = BigInt(0);
      if (existing?.checkIn) {
        const diffNs = now - existing.checkIn;
        workingTime = diffNs / BigInt(1_000_000_000); // ns to seconds
        if (workingTime < BigInt(0)) workingTime = BigInt(0);
      }

      const entry: AttendanceDayEntry = {
        status: existing?.status ?? AttendanceStatus.present,
        checkIn: existing?.checkIn,
        checkOut: now,
        note: note ?? existing?.note ?? '',
        workingTime,
      };
      await actor.saveAttendanceEntry(date, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
    },
    onError: (error) => {
      console.error('Failed to check out:', error);
    },
  });
}

/**
 * Mutation to add a work note to an existing attendance entry
 */
export function useAddWorkNote() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, note }: { date: string; note: string }) => {
      if (!identity) throw new Error('Please log in to add a work note');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');

      const entries = await actor.getAttendanceEntries();
      const existing = entries.find(([d]) => d === date)?.[1];
      if (!existing) throw new Error('No attendance entry found for this date');

      const updated: AttendanceDayEntry = {
        ...existing,
        note: existing.note ? `${existing.note}\n${note}` : note,
      };
      await actor.saveAttendanceEntry(date, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
    },
    onError: (error) => {
      console.error('Failed to add work note:', error);
    },
  });
}

/**
 * Query to fetch working time for a specific date (derived from entries)
 */
export function useGetWorkingTime(date: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['workingTime', date],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const entries = await actor.getAttendanceEntries();
      const entry = entries.find(([d]) => d === date)?.[1];
      return entry?.workingTime ?? BigInt(0);
    },
    enabled: !!actor && !isFetching && !!date,
    retry: 1,
  });
}

/**
 * Query to fetch attendance summary for a month string (YYYY-MM)
 */
export function useGetAttendanceSummary(range: [string, string]) {
  const { actor, isFetching } = useActor();
  // Use the start of the range as the month prefix (YYYY-MM)
  const month = range[0].substring(0, 7);

  return useQuery<AttendanceSummary>({
    queryKey: ['attendanceSummary', range],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAttendanceSummary(month);
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Query to fetch a specific attendance entry by date
 */
export function useGetAttendanceEntry(date: string) {
  const { actor, isFetching } = useActor();

  return useQuery<AttendanceDayEntry | null>({
    queryKey: ['attendanceEntry', date],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const entries = await actor.getAttendanceEntries();
      return entries.find(([d]) => d === date)?.[1] ?? null;
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
      if (!identity) throw new Error('Please log in to edit attendance');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');
      await actor.saveAttendanceEntry(date, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
    },
    onError: (error) => {
      console.error('Failed to edit attendance entry:', error);
    },
  });
}

/**
 * Mutation to "delete" an attendance entry by overwriting with a weekly-off placeholder
 */
export function useDeleteAttendanceEntry() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!identity) throw new Error('Please log in to delete attendance');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');

      const entry: AttendanceDayEntry = {
        status: AttendanceStatus.weeklyOff,
        checkIn: undefined,
        checkOut: undefined,
        note: '',
        workingTime: BigInt(0),
      };
      await actor.saveAttendanceEntry(date, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceEntry'] });
      queryClient.invalidateQueries({ queryKey: ['allAttendanceEntries'] });
    },
    onError: (error) => {
      console.error('Failed to delete attendance entry:', error);
    },
  });
}

/**
 * Query to check if the current user has custom date permission
 */
export function useHasCustomDatePermission() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['customDatePermission'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.hasCustomDatePermission();
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: 1,
  });
}

/**
 * Mutation to grant custom date permission to a user (admin only)
 */
export function useGrantCustomDatePermission() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!identity) throw new Error('Please log in to grant permissions');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');
      await actor.grantCustomDatePermission(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDatePermission'] });
    },
    onError: (error) => {
      console.error('Failed to grant custom date permission:', error);
    },
  });
}

/**
 * Mutation to revoke custom date permission from a user (admin only)
 */
export function useRevokeCustomDatePermission() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!identity) throw new Error('Please log in to revoke permissions');
      if (!actor) throw new Error('Backend connection not ready. Please wait a moment and try again.');
      if (isFetching) throw new Error('Backend is initializing. Please wait a moment and try again.');
      await actor.revokeCustomDatePermission(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDatePermission'] });
    },
    onError: (error) => {
      console.error('Failed to revoke custom date permission:', error);
    },
  });
}
