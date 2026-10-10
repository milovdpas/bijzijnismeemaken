'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    GroupDetailResponse,
    GroupInput,
    GroupListingResponse,
    JoinPreviewResponse,
    Paginated,
    PublicGroupResponse,
} from '@bzim/types';

import { ApiError } from '@/lib/api/client';
import {
    createGroup,
    deleteGroup,
    fetchGroup,
    fetchGroups,
    joinByToken,
    joinGroup,
    previewInvite,
    regenerateInviteLink,
    searchPublicGroups,
    updateGroup,
} from '@/lib/api/groups';
import { queryKeys } from '@/lib/query-keys';

/** A 404 is an answer (not a member, or gone), not a flaky network: never retried. */
function retryUnlessNotFound(count: number, error: Error): boolean {
    return !(error instanceof ApiError && error.status === 404) && count < 2;
}

/** The groups the signed-in person is in, for the overview. */
export function useGroups(): UseQueryResult<GroupListingResponse[]> {
    return useQuery({ queryKey: queryKeys.groups.list, queryFn: fetchGroups });
}

/** One group as this member sees it; the shell and every tab read it. */
export function useGroup(groupId: string): UseQueryResult<GroupDetailResponse> {
    return useQuery({
        queryKey: queryKeys.groups.detail(groupId),
        queryFn: () => fetchGroup(groupId),
        retry: retryUnlessNotFound,
    });
}

/** Creates a group and seeds its detail, so the next screen opens without a fetch. */
export function useCreateGroup(): UseMutationResult<GroupDetailResponse, Error, GroupInput> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: createGroup,
        onSuccess: (group) => {
            client.setQueryData(queryKeys.groups.detail(group.id), group);
            void client.invalidateQueries({ queryKey: queryKeys.groups.list });
        },
    });
}

/** The public overview. Keeps the last page on screen while the next one loads. */
export function usePublicGroups(
    q: string,
    page: number,
): UseQueryResult<Paginated<PublicGroupResponse>> {
    return useQuery({
        queryKey: queryKeys.groups.public(q, page),
        queryFn: () => searchPublicGroups(q, page),
        placeholderData: keepPreviousData,
    });
}

/** Joining a public group by id; the overview and the person's list both change. */
export function useJoinGroup(): UseMutationResult<GroupDetailResponse, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: joinGroup,
        onSuccess: (group) => {
            client.setQueryData(queryKeys.groups.detail(group.id), group);
            void client.invalidateQueries({ queryKey: queryKeys.groups.all });
        },
    });
}

/** What an invite link points at. Off until a token has been read from the URL. */
export function useJoinPreview(token: string | null): UseQueryResult<JoinPreviewResponse> {
    return useQuery({
        queryKey: queryKeys.groups.joinPreview(token ?? ''),
        queryFn: () => previewInvite(token ?? ''),
        enabled: token !== null,
        retry: retryUnlessNotFound,
    });
}

/** Joining through an invite link. */
export function useJoinByToken(): UseMutationResult<GroupDetailResponse, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: joinByToken,
        onSuccess: (group) => {
            client.setQueryData(queryKeys.groups.detail(group.id), group);
            void client.invalidateQueries({ queryKey: queryKeys.groups.all });
        },
    });
}

/** Settings changes; the answer is the fresh detail, so it goes straight into the cache. */
export function useUpdateGroup(
    groupId: string,
): UseMutationResult<GroupDetailResponse, Error, Partial<GroupInput>> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (patch: Partial<GroupInput>) => updateGroup(groupId, patch),
        onSuccess: (group) => {
            client.setQueryData(queryKeys.groups.detail(group.id), group);
            void client.invalidateQueries({ queryKey: queryKeys.groups.list });
        },
    });
}

/** Owner only. Everything cached about the group is dropped with it. */
export function useDeleteGroup(groupId: string): UseMutationResult<void, Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => deleteGroup(groupId),
        onSuccess: () => {
            client.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
            void client.invalidateQueries({ queryKey: queryKeys.groups.list });
        },
    });
}

/** A new link retires the old one, so the detail (which carries it) is refetched. */
export function useRegenerateInviteLink(groupId: string): UseMutationResult<string, Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => regenerateInviteLink(groupId),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
        },
    });
}
