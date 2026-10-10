'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { GroupInviteDto, UserSummary } from '@bzim/types';

import { inviteByHandle } from '@/lib/api/invites';
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

/** Sends an invite; the group's pending list (task 16) is dropped so it refetches. */
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
