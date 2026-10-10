'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ActivityDetailDto, ActivityInput, ActivityListingDto } from '@bzim/types';

import { ApiError } from '@/lib/api/client';
import {
    createActivity,
    fetchActivities,
    fetchActivity,
    updateActivity,
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

/** One activity with its people and occurrences. A 404 is an answer, not a retry. */
export function useActivity(
    groupId: string,
    activityId: string,
): UseQueryResult<ActivityDetailDto> {
    return useQuery({
        queryKey: queryKeys.activities.detail(groupId, activityId),
        queryFn: () => fetchActivity(groupId, activityId),
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
