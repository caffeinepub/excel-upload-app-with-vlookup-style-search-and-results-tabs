import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Reminder as BackendReminder, TodoItem as BackendTodoItem, Note as BackendNote } from '../backend';
import { decodeNoteText } from '../lib/notes/noteEncoding';

// Frontend Reminder type that matches UI expectations
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
  text: string;
  completed: boolean;
  timestamp: bigint;
}

export interface Note {
  id: bigint;
  title: string;
  content: string;
  lastUpdated: bigint;
}

// Convert backend Reminder to frontend Reminder
function mapBackendReminder(backendReminder: BackendReminder): Reminder {
  // Combine date (YYYY-MM-DD) and time (HH:MM) into a timestamp
  const dateTimeString = `${backendReminder.date}T${backendReminder.time}`;
  const timestamp = new Date(dateTimeString).getTime();
  
  return {
    id: backendReminder.id,
    title: backendReminder.message,
    description: '', // Backend doesn't have separate description
    time: BigInt(timestamp),
    repeatInterval: null,
    priority: null,
    isActive: true,
  };
}

// Convert backend TodoItem to frontend ToDoItem
function mapBackendTodoItem(backendTodo: BackendTodoItem): ToDoItem {
  return {
    id: backendTodo.id,
    text: backendTodo.text,
    completed: backendTodo.completed,
    timestamp: backendTodo.timestamp,
  };
}

// Convert backend Note to frontend Note
function mapBackendNote(backendNote: BackendNote): Note {
  const { title, content } = decodeNoteText(backendNote.text);
  
  return {
    id: backendNote.id,
    title,
    content,
    lastUpdated: backendNote.lastUpdated,
  };
}

export function useGetReminders() {
  const { actor, isFetching } = useActor();

  return useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      if (!actor) return [];
      const backendReminders = await actor.getRemindersForCaller();
      return backendReminders.map(mapBackendReminder);
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
      if (!actor) return [];
      const backendTodos = await actor.getTodos();
      return backendTodos.map(mapBackendTodoItem);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetNotes() {
  const { actor, isFetching } = useActor();

  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      if (!actor) return [];
      const backendNotes = await actor.getNotes();
      return backendNotes.map(mapBackendNote);
    },
    enabled: !!actor && !isFetching,
  });
}
