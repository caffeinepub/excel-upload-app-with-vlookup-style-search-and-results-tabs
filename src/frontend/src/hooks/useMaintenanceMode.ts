import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActor } from "./useActor";

export function useMaintenanceMode() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["maintenanceMode"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await (actor as any).getMaintenanceMode();
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
      if (!actor) throw new Error("Not connected — please reload the page");
      try {
        await (actor as any).setMaintenanceMode(enabled);
        return enabled;
      } catch (err) {
        const msg = String(err);
        if (
          msg.includes("Unauthorized") ||
          msg.includes("admin") ||
          msg.includes("not registered")
        ) {
          throw new Error(
            "Admin access required. Make sure you are logged in as admin.",
          );
        }
        throw new Error(`Failed: ${msg}`);
      }
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(["maintenanceMode"], enabled);
      void queryClient.invalidateQueries({ queryKey: ["maintenanceMode"] });
      toast.success(
        enabled
          ? "Maintenance mode ON — users are locked to dashboard"
          : "Maintenance mode OFF — app restored to normal",
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
