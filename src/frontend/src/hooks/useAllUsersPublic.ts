import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";

/** Returns a Map<principalStr, displayName> for all registered users */
export function useAllUsersPublic(): Map<string, string> {
  const { actor, isFetching } = useActor();

  const { data } = useQuery<Map<string, string>>({
    queryKey: ["allUsersPublic"],
    queryFn: async () => {
      if (!actor) return new Map();
      try {
        const users = await actor.getAllRegisteredUsersPublic();
        const map = new Map<string, string>();
        for (const u of users) {
          map.set(u.principal.toString(), u.displayName);
        }
        return map;
      } catch {
        return new Map();
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return data ?? new Map();
}
