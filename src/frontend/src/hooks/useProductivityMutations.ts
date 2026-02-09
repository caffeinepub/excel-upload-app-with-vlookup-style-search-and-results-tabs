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
    mutationFn: async ({ message, date, time }: { message: string; date: string; time: string }) => {
      // Check authentication first
      if (!identity) {
        throw new Error('Please log in to create reminders');
      }
      
      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
      }

      // Validate time format (HH:MM)
      if (!/^\d{2}:\d{2}$/.test(time)) {
        throw new Error('Invalid time format. Please use HH:MM format.');
      }

      // Call backend with local date and time strings
      const reminderId = await actor.addReminder(message, date, time);
      return reminderId;
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
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) {
        throw new Error('Please log in to delete reminders');
      }
      
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      await actor.deleteReminder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error) => {
      console.error('Delete reminder error:', error);
    },
  });
}

export function useCreateTodo() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!identity) {
        throw new Error('Please log in to create to-dos');
      }
      
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      const todo = await actor.addTodo(text);
      return todo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
    onError: (error) => {
      console.error('Create todo error:', error);
    },
  });
}

export function useToggleTodo() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) {
        throw new Error('Please log in to update to-dos');
      }
      
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      await actor.toggleTodo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
    },
    onError: (error) => {
      console.error('Toggle todo error:', error);
    },
  });
}

export function useCreateNote() {
  const { actor } = useActor();
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

      const encodedText = encodeNoteText(title, content);
      const note = await actor.addNote(encodedText);
      return note;
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
  const { actor } = useActor();
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

      await actor.deleteNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      console.error('Delete note error:', error);
    },
  });
}
