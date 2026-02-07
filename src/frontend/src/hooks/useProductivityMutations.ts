import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';

export function useCreateReminder() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, time }: { title: string; description?: string; time: bigint }) => {
      // Check authentication first
      if (!identity) {
        throw new Error('Please log in to create reminders');
      }
      
      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }
      
      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }
      
      // Convert timestamp to date and time strings
      const date = new Date(Number(time));
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().slice(0, 5); // HH:MM
      
      return actor.addReminder(title, dateStr, timeStr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error) => {
      console.error('Create reminder error:', error);
    },
  });
}

export function useDeleteReminder() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      // Check authentication first
      if (!identity) {
        throw new Error('Please log in to delete reminders');
      }
      
      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }
      
      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }
      
      return actor.deleteReminder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error) => {
      console.error('Delete reminder error:', error);
    },
  });
}

export function useCreateCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, startTime }: { title: string; description: string; startTime: bigint }) => {
      // Backend no longer supports calendar events
      throw new Error('Calendar events feature is not available');
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
      // Backend no longer supports calendar events
      throw new Error('Calendar events feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

export function useCreateToDoItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ description }: { description: string }) => {
      // Backend no longer supports to-do items
      throw new Error('To-do items feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
  });
}

export function useDeleteToDoItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      // Backend no longer supports to-do items
      throw new Error('To-do items feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
  });
}

export function useToggleToDoItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: bigint; completed: boolean }) => {
      // Backend no longer supports to-do items
      throw new Error('To-do items feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
  });
}

export function useCreateNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      // Backend no longer supports notes
      throw new Error('Notes feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      // Backend no longer supports notes
      throw new Error('Notes feature is not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
