import type { Principal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import type { ApprovalStatus, UserProfile } from "../backend";
import { useActor } from "./useActor";

export interface ObservableUser {
  principal: Principal;
  status: ApprovalStatus;
  profile: UserProfile | null;
}

export function useObserveUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<ObservableUser[]>({
    queryKey: ["observeUsers"],
    queryFn: async () => {
      if (!actor) return [];
      const approvals = await actor.listApprovals();
      const users: ObservableUser[] = await Promise.all(
        approvals.map(async (approval) => {
          let profile: UserProfile | null = null;
          try {
            profile = await actor.getUserProfile(approval.principal);
          } catch {
            // ignore
          }
          return {
            principal: approval.principal,
            status: approval.status,
            profile,
          };
        }),
      );
      return users;
    },
    enabled: !!actor && !isFetching,
  });
}
