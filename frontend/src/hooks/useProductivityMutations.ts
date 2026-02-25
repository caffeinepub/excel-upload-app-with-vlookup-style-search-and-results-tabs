import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

// ── Reminders ─────────────────────────────────────────────────────────────────

interface CreateReminderInput {
  message: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  repeatUntilDate?: string | null; // YYYY-MM-DD or null/undefined
}

interface UpdateReminderInput {
  id: bigint;
  message: string;
  date: string;
  time: string;
  repeatUntilDate?: string | null;
}

function dateStringToEndOfDayMs(dateStr: string): bigint {
  // Parse YYYY-MM-DD as local date end-of-day
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 23, 59, 59, 999);
  return BigInt(d.getTime());
}

export function useCreateReminder() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      if (!input.message.trim()) throw new Error('Reminder message cannot be empty');
      if (!input.date) throw new Error('Date is required');
      if (!input.time) throw new Error('Time is required');

      const repeatUntilDate: bigint | null =
        input.repeatUntilDate && input.repeatUntilDate.trim()
          ? dateStringToEndOfDayMs(input.repeatUntilDate)
          : null;

      return actor.createReminder(
        input.message.trim(),
        input.date,
        input.time,
        repeatUntilDate
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['remindersForDate'] });
    },
  });
}

export function useUpdateReminder() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateReminderInput) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      if (!input.message.trim()) throw new Error('Reminder message cannot be empty');

      const repeatUntilDate: bigint | null =
        input.repeatUntilDate && input.repeatUntilDate.trim()
          ? dateStringToEndOfDayMs(input.repeatUntilDate)
          : null;

      return actor.updateReminder(
        input.id,
        input.message.trim(),
        input.date,
        input.time,
        repeatUntilDate
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['remindersForDate'] });
    },
  });
}

export function useDeleteReminder() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.deleteReminder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['remindersForDate'] });
    },
  });
}

// ── Todos ─────────────────────────────────────────────────────────────────────

export function useCreateTodo() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      if (!text.trim()) throw new Error('Todo text cannot be empty');
      return actor.addTodo(text.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

export function useToggleTodo() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.toggleTodo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

export function useDeleteTodo() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.deleteTodo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useCreateNote() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      const sep = '||TITLE||';
      const text = `${title}${sep}${content}`;
      // Pass 0 as id to create a new note (backend assigns new id when not found)
      return actor.saveNote(BigInt(0), text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.deleteNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
