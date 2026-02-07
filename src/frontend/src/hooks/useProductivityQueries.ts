import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

// Define local types since backend no longer exports these
export interface Reminder {
  id: bigint;
  title: string;
  description: string;
  time: bigint;
  repeatInterval: bigint | null;
  priority: bigint | null;
  isActive: boolean;
}

export interface CalendarEvent {
  id: bigint;
  title: string;
  description: string;
  startTime: bigint;
  endTime: bigint | null;
  location: string | null;
  participants: string[];
}

export interface ToDoItem {
  id: bigint;
  description: string;
  deadline: bigint | null;
  priority: bigint | null;
  completed: boolean;
  tags: string[];
}

export interface Note {
  id: bigint;
  title: string;
  content: string;
  tags: string[];
  lastUpdated: bigint;
}

export function useGetReminders() {
  const { actor, isFetching } = useActor();

  return useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      // Backend no longer supports reminders
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCalendarEvents() {
  const { actor, isFetching } = useActor();

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      // Backend no longer supports calendar events
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetToDoItems() {
  const { actor, isFetching } = useActor();

  return useQuery<ToDoItem[]>({
    queryKey: ['todoItems'],
    queryFn: async () => {
      // Backend no longer supports to-do items
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetNotes() {
  const { actor, isFetching } = useActor();

  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      // Backend no longer supports notes
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}
