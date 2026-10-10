'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeResponse, UpdateMeRequest } from '@bzim/types';

import { logout } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { fetchMe, updateMe } from '@/lib/api/users';
import { queryKeys } from '@/lib/query-keys';

/**
 * The signed-in user. A 401 is a normal answer here, not a flaky network, so
 * it is never retried: `AuthGate` reads it as "go to login".
 */
export function useMe() {
    return useQuery({
        queryKey: queryKeys.me,
        queryFn: fetchMe,
        staleTime: 5 * 60_000,
        retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
    });
}

/** Writes the profile and puts the answer straight into the cache. */
export function useUpdateMe() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (patch: UpdateMeRequest) => updateMe(patch),
        onSuccess: (me: MeResponse) => {
            client.setQueryData(queryKeys.me, me);
        },
    });
}

/** Signs out and empties every cached answer: nothing in there belongs to the next person. */
export function useLogout() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: logout,
        onSettled: () => {
            client.clear();
        },
    });
}
