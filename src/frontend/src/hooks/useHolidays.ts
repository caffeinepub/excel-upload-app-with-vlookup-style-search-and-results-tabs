import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Holiday } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

/**
 * Query to fetch all holidays (new Holiday system)
 */
export function useGetHolidays() {
  const { actor, isFetching } = useActor();

  return useQuery<Holiday[]>({
    queryKey: ["holidays"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHolidays();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

// Keep backward-compat alias
export const useGetAllHolidays = useGetHolidays;

/**
 * Query to check if the current user is an admin
 */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: 1,
  });
}

/**
 * Mutation to create a new holiday
 */
export function useCreateHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      date,
      holidayType,
      applicableDepartments,
      description,
    }: {
      name: string;
      date: bigint;
      holidayType: string;
      applicableDepartments: bigint[];
      description: string;
    }) => {
      if (!identity) throw new Error("Please log in to manage holidays");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      await actor.createHoliday(
        name,
        date,
        holidayType,
        applicableDepartments,
        description,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
    },
    onError: (error) => {
      console.error("Failed to create holiday:", error);
    },
  });
}

/**
 * Mutation to update an existing holiday
 */
export function useUpdateHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      date,
      holidayType,
      applicableDepartments,
      description,
    }: {
      id: bigint;
      name: string;
      date: bigint;
      holidayType: string;
      applicableDepartments: bigint[];
      description: string;
    }) => {
      if (!identity) throw new Error("Please log in to manage holidays");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      await actor.updateHoliday(
        id,
        name,
        date,
        holidayType,
        applicableDepartments,
        description,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
    },
    onError: (error) => {
      console.error("Failed to update holiday:", error);
    },
  });
}

/**
 * Mutation to delete a holiday
 */
export function useDeleteHoliday() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!identity) throw new Error("Please log in to manage holidays");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      await actor.deleteHoliday(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });
    },
    onError: (error) => {
      console.error("Failed to delete holiday:", error);
    },
  });
}
