import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useMaintenanceMode() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["maintenanceMode"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        const a = actor as unknown as {
          getMaintenanceMode: () => Promise<boolean>;
        };
        return await a.getMaintenanceMode();
      } catch {
        return false;
      }
    },
    enabled: !!actor,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useSetMaintenanceMode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!actor) return false;
      const a = actor as unknown as {
        setMaintenanceMode: (e: boolean) => Promise<boolean>;
      };
      return await a.setMaintenanceMode(enabled);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maintenanceMode"] });
    },
  });
}
