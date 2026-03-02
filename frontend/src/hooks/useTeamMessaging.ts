import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Channel, ChannelMessage, DirectMessage, UserStatusEntry, UserStatusKind } from '../backend';
import type { Principal } from '@dfinity/principal';
import { useListApprovals } from './useApproval';
import { useGetUserProfile } from './useUserProfile';

export function useListChannels() {
  const { actor, isFetching } = useActor();

  return useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listChannels();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createChannel(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useDeleteChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteChannel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useGetChannelMessages(channelId?: bigint | null) {
  const { actor, isFetching } = useActor();
  const id = channelId ?? null;

  return useQuery<ChannelMessage[]>({
    queryKey: ['channelMessages', id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return [];
      return actor.getChannelMessages(id);
    },
    enabled: !!actor && !isFetching && id !== null,
    refetchInterval: 5000,
  });
}

export function usePostChannelMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      channelId: bigint;
      senderName: string;
      text: string;
      fileUrl?: string | null;
      fileName?: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.postChannelMessage(
        params.channelId,
        params.senderName,
        params.text,
        params.fileUrl ?? null,
        params.fileName ?? null
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channelMessages', variables.channelId.toString()] });
    },
  });
}

export function useGetDirectMessages(otherPrincipalStr?: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<DirectMessage[]>({
    queryKey: ['directMessages', otherPrincipalStr],
    queryFn: async () => {
      if (!actor || !otherPrincipalStr) return [];
      const { Principal } = await import('@dfinity/principal');
      const principal = Principal.fromText(otherPrincipalStr);
      return actor.getDirectMessages(principal);
    },
    enabled: !!actor && !isFetching && !!otherPrincipalStr,
    refetchInterval: 5000,
  });
}

export function useSendDirectMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      toPrincipal: Principal;
      text: string;
      fileUrl?: string | null;
      fileName?: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendDirectMessage(
        params.toPrincipal,
        params.text,
        params.fileUrl ?? null,
        params.fileName ?? null
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directMessages', variables.toPrincipal.toString()] });
    },
  });
}

export function useGetUserStatuses() {
  const { actor, isFetching } = useActor();

  return useQuery<UserStatusEntry[]>({
    queryKey: ['userStatuses'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserStatuses();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useSetUserStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: UserStatusKind) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserStatus(status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStatuses'] });
    },
  });
}

export interface TeamUser {
  principalStr: string;
  displayName: string;
}

/**
 * Returns all approved users enriched with their display names.
 * Used for the "New DM" user search dialog.
 */
export function useGetAllUsers(): { data: TeamUser[]; isLoading: boolean } {
  const { data: approvals = [], isLoading: approvalsLoading } = useListApprovals();

  // Build a stable list of principal strings from approvals
  const users: TeamUser[] = approvals.map((a) => ({
    principalStr: a.principal.toString(),
    displayName: '',
  }));

  return {
    data: users,
    isLoading: approvalsLoading,
  };
}
