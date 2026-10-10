'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { GroupDetailResponse, GroupInviteDto, UserSummary } from '@bzim/types';

import {
    acceptInvite,
    cancelInvite,
    declineInvite,
    fetchGroupInvites,
    fetchMyInvites,
    inviteByHandle,
} from '@/lib/api/invites';
import { searchUsers } from '@/lib/api/users';
import { queryKeys } from '@/lib/query-keys';

/** Handle prefix search for the invite box. Off below two characters, as the API requires. */
export function useUserSearch(q: string): UseQueryResult<UserSummary[]> {
    return useQuery({
        queryKey: queryKeys.users.search(q),
        queryFn: () => searchUsers(q),
        enabled: q.length >= 2,
        staleTime: 30_000,
    });
}

/** Pending invites of one group, for its admins. */
export function useGroupInvites(groupId: string): UseQueryResult<GroupInviteDto[]> {
    return useQuery({
        queryKey: queryKeys.invites.group(groupId),
        queryFn: () => fetchGroupInvites(groupId),
    });
}

export function useInviteByHandle(
    groupId: string,
): UseMutationResult<GroupInviteDto, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (handle: string) => inviteByHandle(groupId, handle),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.invites.group(groupId) });
        },
    });
}

export function useCancelInvite(groupId: string): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (inviteId: string) => cancelInvite(groupId, inviteId),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.invites.group(groupId) });
        },
    });
}

/** What is waiting for the signed-in person's answer. Also feeds the banner on the groups page. */
export function useMyInvites(): UseQueryResult<GroupInviteDto[]> {
    return useQuery({ queryKey: queryKeys.invites.mine, queryFn: fetchMyInvites });
}

/** Accepting makes a membership: the person's groups change, and the new group is cached. */
export function useAcceptInvite(): UseMutationResult<GroupDetailResponse, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: acceptInvite,
        onSuccess: (group) => {
            client.setQueryData(queryKeys.groups.detail(group.id), group);
            void client.invalidateQueries({ queryKey: queryKeys.invites.mine });
            void client.invalidateQueries({ queryKey: queryKeys.groups.list });
        },
    });
}

export function useDeclineInvite(): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: declineInvite,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.invites.mine });
        },
    });
}
