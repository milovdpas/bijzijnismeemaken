'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { GroupMemberResponse, GroupRole } from '@bzim/types';

import {
    changeMemberRole,
    fetchMembers,
    leaveGroup,
    removeMember,
    transferOwnership,
} from '@/lib/api/members';
import { queryKeys } from '@/lib/query-keys';

/** Everyone in the group, ordered by display name as the API returns them. */
export function useMembers(groupId: string): UseQueryResult<GroupMemberResponse[]> {
    return useQuery({
        queryKey: queryKeys.members.list(groupId),
        queryFn: () => fetchMembers(groupId),
    });
}

/**
 * The three member actions share one invalidation: the member list changes,
 * and the group detail (member count, my role after a transfer) with it.
 */
function useMemberAction<TArgs>(
    groupId: string,
    action: (args: TArgs) => Promise<void>,
): UseMutationResult<void, Error, TArgs> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
            void client.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
        },
    });
}

export function useChangeRole(
    groupId: string,
): UseMutationResult<void, Error, { userId: string; role: GroupRole }> {
    return useMemberAction(groupId, ({ userId, role }) => changeMemberRole(groupId, userId, role));
}

export function useRemoveMember(groupId: string): UseMutationResult<void, Error, string> {
    return useMemberAction(groupId, (userId) => removeMember(groupId, userId));
}

export function useTransferOwnership(groupId: string): UseMutationResult<void, Error, string> {
    return useMemberAction(groupId, (userId) => transferOwnership(groupId, userId));
}

/** Leaving drops the group from every cache; the person has no business with it any more. */
export function useLeaveGroup(groupId: string): UseMutationResult<void, Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => leaveGroup(groupId),
        onSuccess: () => {
            client.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
            client.removeQueries({ queryKey: queryKeys.members.list(groupId) });
            void client.invalidateQueries({ queryKey: queryKeys.groups.list });
        },
    });
}
