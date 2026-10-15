'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    GroupAvailabilityResponse,
    GroupOccurrenceDto,
    MyAvailabilityResponse,
    UnavailabilityDto,
    UnavailabilityRuleDto,
    UnavailabilityRuleInput,
} from '@bzim/types';

import {
    createRule,
    deleteRule,
    fetchGroupAvailability,
    fetchMyAvailability,
    fetchRules,
    setBlock,
} from '@/lib/api/availability';
import { fetchGroupOccurrences } from '@/lib/api/occurrences';
import { applyChange } from '@/lib/my-availability';
import type { BlockChangeKind } from '@/lib/my-availability';
import { queryKeys } from '@/lib/query-keys';

/** The caller's own days with reasons. The previous month stays while the next loads. */
export function useMyAvailability(
    from: string,
    to: string,
): UseQueryResult<MyAvailabilityResponse> {
    return useQuery({
        queryKey: queryKeys.availability.mine(from, to),
        queryFn: () => fetchMyAvailability(from, to),
        placeholderData: keepPreviousData,
    });
}

export interface BlockChange extends UnavailabilityDto {
    change: BlockChangeKind;
    /** The range on screen, so the optimistic update lands in the right cache entry. */
    from: string;
    to: string;
}

/**
 * Tapping a cell flips it at once and the API catches up; a failure flips it
 * back. Every cached month is refetched afterwards, since a block can sit in
 * two overlapping ranges.
 */
export function useSetBlock(): UseMutationResult<
    void,
    Error,
    BlockChange,
    { previous?: MyAvailabilityResponse }
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ date, daypart, change }) => setBlock(date, daypart, change),
        onMutate: async ({ date, daypart, change, from, to }) => {
            const key = queryKeys.availability.mine(from, to);
            await client.cancelQueries({ queryKey: key });
            const previous = client.getQueryData<MyAvailabilityResponse>(key);
            if (previous !== undefined) {
                client.setQueryData<MyAvailabilityResponse>(key, {
                    ...previous,
                    days: previous.days.map((day) =>
                        day.date === date ? applyChange(day, daypart, change) : day,
                    ),
                });
            }
            return { previous };
        },
        onError: (_error, { from, to }, context) => {
            if (context?.previous !== undefined) {
                client.setQueryData(queryKeys.availability.mine(from, to), context.previous);
            }
        },
        onSettled: () => {
            void client.invalidateQueries({ queryKey: queryKeys.availability.mineAll });
        },
    });
}

export function useRules(): UseQueryResult<UnavailabilityRuleDto[]> {
    return useQuery({ queryKey: queryKeys.availability.rules, queryFn: fetchRules });
}

/** A rule changes every matching day, so the month on screen is refetched with it. */
export function useCreateRule(): UseMutationResult<
    UnavailabilityRuleDto,
    Error,
    UnavailabilityRuleInput
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: createRule,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.availability.rules });
            void client.invalidateQueries({ queryKey: queryKeys.availability.mineAll });
        },
    });
}

export function useDeleteRule(): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: deleteRule,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.availability.rules });
            void client.invalidateQueries({ queryKey: queryKeys.availability.mineAll });
        },
    });
}

/** The group matrix, optionally narrowed to the people in for one activity. */
export function useGroupAvailability(
    groupId: string,
    from: string,
    to: string,
    activityId: string | undefined,
): UseQueryResult<GroupAvailabilityResponse> {
    return useQuery({
        queryKey: queryKeys.availability.group(groupId, from, to, activityId),
        queryFn: () => fetchGroupAvailability(groupId, from, to, activityId),
        placeholderData: keepPreviousData,
    });
}

/** What is already planned in the range, for the overlay on the group grid. */
export function useGroupOccurrences(
    groupId: string,
    from: string,
    to: string,
): UseQueryResult<GroupOccurrenceDto[]> {
    return useQuery({
        queryKey: queryKeys.occurrences.group(groupId, from, to),
        queryFn: () => fetchGroupOccurrences(groupId, from, to),
        placeholderData: keepPreviousData,
    });
}
