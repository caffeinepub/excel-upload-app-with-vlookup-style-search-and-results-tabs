import { useQuery } from "@tanstack/react-query";
import type { AdminUserInfo, UserApprovalInfo } from "../backend";
import { useActor } from "./useActor";

/**
 * Query to check if the current caller is approved
 */
export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerApproved"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerApproved();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Query to check if the current caller is an admin
 */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Query to list all user approvals (admin only)
 */
export function useListApprovals() {
  const { actor, isFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Convenience hook that returns isAdmin flag and loading state.
 * Used by components that need a simple isAdmin boolean.
 */
export function useApproval() {
  const { data: isAdmin = false, isLoading } = useIsCallerAdmin();
  return { isAdmin, isLoading };
}

/**
 * Query to get ALL users for the admin panel — includes display names and
 * merges users who have profiles but haven't been added to the approval map yet.
 */
export function useGetAllUsersForAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<AdminUserInfo[]>({
    queryKey: ["allUsersForAdmin"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsersForAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    refetchInterval: 10000,
  });
}
