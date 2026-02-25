import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Reminder, TodoItem, Note } from '../backend';

export interface UIReminder {
  id: bigint;
  message: string;
  date: string;
  time: string;
  repeatUntilDate?: bigint;
  createdAt: bigint;
}

export interface UITodo {
  id: bigint;
  text: string;
  completed: boolean;
  timestamp: bigint;
}

export interface UINote {
  id: bigint;
  title: string;
  content: string;
  lastUpdated: bigint;
}

function mapReminder(r: Reminder): UIReminder {
  return {
    id: r.id,
    message: r.message,
    date: r.date,
    time: r.time,
    repeatUntilDate: r.repeatUntilDate,
    createdAt: r.createdAt,
  };
}

export function useGetReminders() {
  const { actor, isFetching } = useActor();

  return useQuery<UIReminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getReminders();
      return result.map(mapReminder);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRemindersForDate(dateMs: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<UIReminder[]>({
    queryKey: ['remindersForDate', dateMs.toString()],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getRemindersForDate(dateMs);
      return result.map(mapReminder);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTodos() {
  const { actor, isFetching } = useActor();

  return useQuery<UITodo[]>({
    queryKey: ['todos'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getTodos();
      return result.map((t: TodoItem) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        timestamp: t.timestamp,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetNotes() {
  const { actor, isFetching } = useActor();

  return useQuery<UINote[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNotes();
      return result.map((n: Note) => {
        const sep = '||TITLE||';
        const idx = n.text.indexOf(sep);
        let title = '';
        let content = n.text;
        if (idx !== -1) {
          title = n.text.substring(0, idx);
          content = n.text.substring(idx + sep.length);
        }
        return {
          id: n.id,
          title,
          content,
          lastUpdated: n.lastUpdated,
        };
      });
    },
    enabled: !!actor && !isFetching,
  });
}
