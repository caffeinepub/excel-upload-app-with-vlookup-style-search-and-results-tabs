import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserApprovalInfo } from '../backend';

/**
 * Query to check if the current caller is approved
 */
export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
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
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
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
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}
