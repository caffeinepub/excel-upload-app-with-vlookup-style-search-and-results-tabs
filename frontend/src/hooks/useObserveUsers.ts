import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useIsCallerAdmin } from './useApproval';
import type { UserProfile, ApprovalStatus } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

export interface ObservableUser {
  principal: Principal;
  status: ApprovalStatus;
  profile: UserProfile | null;
}

/**
 * Hook to fetch all observable users with their profiles
 * Admin-only query that combines approval data with user profiles
 */
export function useObserveUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  return useQuery<ObservableUser[]>({
    queryKey: ['admin', 'observe-users'],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not available');
      }

      // Fetch all user approvals
      const approvals = await actor.listApprovals();

      // Fetch profiles for each user
      const usersWithProfiles = await Promise.all(
        approvals.map(async (approval) => {
          try {
            const profile = await actor.getUserProfile(approval.principal);
            return {
              principal: approval.principal,
              status: approval.status,
              profile,
            };
          } catch (error) {
            console.error(`Failed to fetch profile for ${approval.principal.toString()}:`, error);
            return {
              principal: approval.principal,
              status: approval.status,
              profile: null,
            };
          }
        })
      );

      return usersWithProfiles;
    },
    enabled: !!actor && !actorFetching && !adminLoading && !!isAdmin,
    retry: false,
  });
}
