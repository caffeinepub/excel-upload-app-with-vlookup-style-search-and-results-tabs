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
    refetchInterval: 8_000,
    staleTime: 3_000,
  });
}

export function useSetMaintenanceMode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!actor) throw new Error("Not connected");
      const result = await (
        actor as unknown as MaintenanceActor
      ).setMaintenanceMode(enabled);
      if (!result) {
        throw new Error(
          "Failed to update maintenance mode — admin access required",
        );
      }
      return result;
    },
    onSuccess: (_data, enabled) => {
      void queryClient.invalidateQueries({ queryKey: ["maintenanceMode"] });
      void queryClient.refetchQueries({ queryKey: ["maintenanceMode"] });
      toast.success(
        enabled
          ? "Maintenance mode ON — users are locked to dashboard"
          : "Maintenance mode OFF — app restored to normal",
      );
    },
    onError: (err) => {
      toast.error(`Maintenance mode update failed: ${String(err)}`);
    },
  });
}
