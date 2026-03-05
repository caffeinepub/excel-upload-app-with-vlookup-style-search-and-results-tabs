import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BroadcastMessage } from "../backend";
import { useActor } from "./useActor";

export function useGetActiveBroadcasts(enabled = true) {
  const { actor, isFetching } = useActor();

  return useQuery<BroadcastMessage[]>({
    queryKey: ["activeBroadcasts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveBroadcasts();
    },
    enabled: !!actor && !isFetching && enabled,
    refetchInterval: 10000,
  });
}

export function useGetBroadcastHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<BroadcastMessage[]>({
    queryKey: ["broadcastHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBroadcastHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDismissBroadcast() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.dismissBroadcast(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeBroadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcastHistory"] });
    },
  });
}

export function useCreateBroadcast() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createBroadcast(text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeBroadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["broadcastHistory"] });
    },
  });
}
