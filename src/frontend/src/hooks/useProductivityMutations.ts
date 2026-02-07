import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';
import { encodeNoteText } from '../lib/notes/noteEncoding';

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
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!identity) {
        throw new Error('Please log in to create to-do items');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      return actor.addTodo(text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
    onError: (error) => {
      console.error('Create to-do error:', error);
    },
  });
}

export function useToggleToDoItem() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) {
        throw new Error('Please log in to toggle to-do items');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      return actor.toggleTodo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
    onError: (error) => {
      console.error('Toggle to-do error:', error);
    },
  });
}

export function useCreateNote() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!identity) {
        throw new Error('Please log in to create notes');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      const encodedText = encodeNoteText(title, content);
      return actor.addNote(encodedText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      console.error('Create note error:', error);
    },
  });
}

export function useDeleteNote() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) {
        throw new Error('Please log in to delete notes');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      return actor.deleteNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      console.error('Delete note error:', error);
    },
  });
}
