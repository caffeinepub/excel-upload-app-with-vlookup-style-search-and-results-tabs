import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActor } from "./useActor";

type MaintenanceActor = {
  getMaintenanceMode: () => Promise<boolean>;
  setMaintenanceMode: (e: boolean) => Promise<boolean>;
};

export function useMaintenanceMode() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["maintenanceMode"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await (
          actor as unknown as MaintenanceActor
        ).getMaintenanceMode();
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
      return await (actor as unknown as MaintenanceActor).setMaintenanceMode(
        enabled,
      );
    },
    onSuccess: (_data, enabled) => {
      void queryClient.invalidateQueries({ queryKey: ["maintenanceMode"] });
      void queryClient.refetchQueries({ queryKey: ["maintenanceMode"] });
      toast.success(enabled ? "Maintenance mode ON" : "Maintenance mode OFF");
    },
    onError: () => {
      toast.error("Failed to toggle maintenance mode");
    },
  });
}
