'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    ActivityDetailDto,
    ActivityInput,
    ActivityListingDto,
    OccurrenceInput,
    OccurrenceUpdateInput,
    SuggestionsResponse,
} from '@bzim/types';

import { ApiError } from '@/lib/api/client';
import {
    createActivity,
    deleteActivity,
    deleteOccurrence,
    fetchActivities,
    fetchActivity,
    fetchSuggestions,
    planOccurrence,
    setMemberInterest,
    setMyInterest,
    updateActivity,
    updateOccurrence,
} from '@/lib/api/activities';
import type { ActivityFilters } from '@/lib/api/activities';
import { queryKeys } from '@/lib/query-keys';

/** The group's list under the current filter. The previous list stays while a new filter loads. */
export function useActivities(
    groupId: string,
    filters: ActivityFilters,
): UseQueryResult<ActivityListingDto[]> {
    return useQuery({
        queryKey: queryKeys.activities.list(groupId, filters.label, filters.sort),
        queryFn: () => fetchActivities(groupId, filters),
        placeholderData: keepPreviousData,
    });
}

/**
 * One activity with its people and occurrences. A 404 is an answer, not a
 * retry; an empty id (the "new" form) asks nothing, since the bare path
 * would be the list.
 */
export function useActivity(
    groupId: string,
    activityId: string,
): UseQueryResult<ActivityDetailDto> {
    return useQuery({
        queryKey: queryKeys.activities.detail(groupId, activityId),
        queryFn: () => fetchActivity(groupId, activityId),
        enabled: activityId !== '',
        retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    });
}

export function useCreateActivity(
    groupId: string,
): UseMutationResult<ActivityDetailDto, Error, ActivityInput> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: ActivityInput) => createActivity(groupId, input),
        onSuccess: (activity) => {
            client.setQueryData(queryKeys.activities.detail(groupId, activity.id), activity);
            void client.invalidateQueries({ queryKey: queryKeys.activities.all(groupId) });
        },
    });
}

export function useUpdateActivity(
    groupId: string,
    activityId: string,
): UseMutationResult<ActivityDetailDto, Error, Partial<ActivityInput>> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (patch: Partial<ActivityInput>) => updateActivity(groupId, activityId, patch),
        onSuccess: (activity) => {
            client.setQueryData(queryKeys.activities.detail(groupId, activity.id), activity);
            void client.invalidateQueries({ queryKey: queryKeys.activities.all(groupId) });
        },
    });
}

/** Drops the activity from every cache; the list no longer has it. */
export function useDeleteActivity(groupId: string): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (activityId: string) => deleteActivity(groupId, activityId),
        onSuccess: (_result, activityId) => {
            client.removeQueries({ queryKey: queryKeys.activities.detail(groupId, activityId) });
            void client.invalidateQueries({ queryKey: queryKeys.activities.all(groupId) });
        },
    });
}

/**
 * Interest changes, the caller's own or (for admins) somebody else's. Both
 * refetch the activity, since the "in" list is what the detail shows.
 */
export function useSetInterest(
    groupId: string,
    activityId: string,
): UseMutationResult<void, Error, { userId: string | null; inFor: boolean }> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, inFor }) =>
            userId === null
                ? setMyInterest(groupId, activityId, inFor)
                : setMemberInterest(groupId, activityId, userId, inFor),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.activities.all(groupId) });
        },
    });
}

/** Plan, change or remove an occurrence. One invalidation serves all three: the activity carries them. */
function useOccurrenceMutation<TArgs>(
    groupId: string,
    action: (args: TArgs) => Promise<unknown>,
): UseMutationResult<unknown, Error, TArgs> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.activities.all(groupId) });
        },
    });
}

export function usePlanOccurrence(
    groupId: string,
    activityId: string,
): UseMutationResult<unknown, Error, OccurrenceInput> {
    return useOccurrenceMutation(groupId, (input: OccurrenceInput) =>
        planOccurrence(groupId, activityId, input),
    );
}

export function useUpdateOccurrence(
    groupId: string,
    activityId: string,
): UseMutationResult<unknown, Error, { occurrenceId: string; patch: OccurrenceUpdateInput }> {
    return useOccurrenceMutation(
        groupId,
        ({ occurrenceId, patch }: { occurrenceId: string; patch: OccurrenceUpdateInput }) =>
            updateOccurrence(groupId, activityId, occurrenceId, patch),
    );
}

export function useDeleteOccurrence(
    groupId: string,
    activityId: string,
): UseMutationResult<unknown, Error, string> {
    return useOccurrenceMutation(groupId, (occurrenceId: string) =>
        deleteOccurrence(groupId, activityId, occurrenceId),
    );
}

/** Ranked dates for the chosen people. Keeps the last list while a new selection loads. */
export function useSuggestions(
    groupId: string,
    activityId: string,
    memberIds: string[],
): UseQueryResult<SuggestionsResponse> {
    const key = [...memberIds].sort().join(',');
    return useQuery({
        queryKey: queryKeys.activities.suggestions(groupId, activityId, key),
        queryFn: () => fetchSuggestions(groupId, activityId, memberIds),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
}
