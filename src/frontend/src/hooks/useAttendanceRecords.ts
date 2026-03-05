import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceRecord, BreakPeriod, Shift } from "../backend";
import { useActor } from "./useActor";

export function useGetAttendanceRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, AttendanceRecord][]>({
    queryKey: ["attendanceRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAttendanceRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployeeAttendanceRecords(
  employeePrincipal: string | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<[string, AttendanceRecord][]>({
    queryKey: ["attendanceRecords", "employee", employeePrincipal],
    queryFn: async () => {
      if (!actor || !employeePrincipal) return [];
      const { Principal } = await import("@dfinity/principal");
      return actor.getEmployeeAttendanceRecords(
        Principal.fromText(employeePrincipal),
      );
    },
    enabled: !!actor && !isFetching && !!employeePrincipal,
  });
}

export function useCreateOrUpdateAttendanceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      shift,
      breaks,
      notes,
    }: {
      date: string;
      shift: Shift;
      breaks: BreakPeriod[];
      notes: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createOrUpdateAttendanceRecord(date, shift, breaks, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
    },
  });
}

export function useAddBreakToRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      newBreak,
    }: { date: string; newBreak: BreakPeriod }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addBreakToRecord(date, newBreak);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
    },
  });
}
