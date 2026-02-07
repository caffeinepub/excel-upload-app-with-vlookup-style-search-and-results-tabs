import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { ApprovalStatus } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

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
        throw new Error('Please log in to request approval');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
    onError: (error) => {
      console.error('Failed to request approval:', error);
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
    mutationFn: async ({ user, status }: { user: Principal; status: ApprovalStatus }) => {
      if (!identity) {
        throw new Error('Please log in to manage approvals');
      }

      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
    onError: (error) => {
      console.error('Failed to set approval:', error);
    },
  });
}
