import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principalStr: string | null | undefined) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principalStr],
    queryFn: async () => {
      if (!actor || !principalStr) return null;
      const { Principal } = await import("@dfinity/principal");
      try {
        const principal = Principal.fromText(principalStr);
        return actor.getUserProfile(principal);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!principalStr,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
      return profile;
    },
    onSuccess: (savedProfile) => {
      // Update the caller profile cache immediately
      queryClient.setQueryData(["currentUserProfile"], savedProfile);

      // Also invalidate the per-principal cache for the current user
      const principalStr = identity?.getPrincipal().toString();
      if (principalStr) {
        queryClient.setQueryData(["userProfile", principalStr], savedProfile);
      }

      // Invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      if (principalStr) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", principalStr],
        });
      }
    },
  });
}
