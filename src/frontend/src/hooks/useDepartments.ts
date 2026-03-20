import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Department, UserProfileFull } from "../backend";
import { useActor } from "./useActor";

export function useListDepartments() {
  const { actor, isFetching } = useActor();
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDepartments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUsersInDepartment(departmentId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfileFull[]>({
    queryKey: ["usersInDepartment", departmentId],
    queryFn: async () => {
      if (!actor || !departmentId) return [];
      try {
        return await actor.getUsersInDepartment(departmentId);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!departmentId,
    staleTime: 30000,
  });
}

export function useCreateDepartment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createDepartment(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newName }: { id: bigint; newName: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateDepartment(id, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteDepartment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useAdminAssignUserToDepartment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      departmentId,
    }: { user: Principal; departmentId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminAssignUserToDepartment(user, departmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["observeUsers"] });
      queryClient.invalidateQueries({ queryKey: ["usersInDepartment"] });
    },
  });
}
