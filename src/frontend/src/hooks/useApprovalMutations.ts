import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApprovalStatus } from "../backend";
import { parsePrincipal } from "../utils/principal/parsePrincipal";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

/**
 * Mutation to request approval for the current user
 */
export function useRequestApproval() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!identity) {
        throw new Error("Please log in to request approval");
      }

      if (!actor) {
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      }

      if (isFetching) {
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      }

      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
    onError: (error) => {
      console.error("Failed to request approval:", error);
    },
  });
}

/**
 * Mutation to set approval status for a user (admin only)
 */
export function useSetApproval() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      status,
    }: { user: Principal | string; status: ApprovalStatus }) => {
      if (!identity) {
        throw new Error("Please log in to manage approvals");
      }

      if (!actor) {
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      }

      if (isFetching) {
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      }

      // Validate and normalize the Principal
      const parseResult = parsePrincipal(user);
      if (!parseResult.success) {
        throw new Error(`Invalid Principal ID. ${parseResult.error}`);
      }

      await actor.setApproval(parseResult.principal, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
    onError: (error) => {
      console.error("Failed to set approval:", error);
    },
  });
}

/**
 * Mutation to delete a user (admin only).
 * Uses setApproval with rejected status as a workaround since no deleteUser endpoint exists.
 */
export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      // Use setApproval(rejected) as a way to effectively remove user access
      await actor.setApproval(principal, ApprovalStatus.rejected);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["allRegisteredUsers"] });
      queryClient.invalidateQueries({ queryKey: ["observeUsers"] });
    },
    onError: (error) => {
      console.error("Failed to delete user:", error);
    },
  });
}

/**
 * Mutation to permanently and completely remove a user (admin only).
 * Removes from approval state, roles, profiles, and permissions.
 */
export function useRemoveUserCompletely() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.removeUserCompletely(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersForAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["allRegisteredUsers"] });
      queryClient.invalidateQueries({ queryKey: ["observeUsers"] });
    },
    onError: (error) => {
      console.error("Failed to remove user:", error);
    },
  });
}
