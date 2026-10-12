'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    AddCalendarFeedInput,
    CalendarConnectionDto,
    CalendarEventDto,
    CalendarFeedDto,
    CalendarIgnoreRuleDto,
    CalendarIgnoreRuleInput,
    CalendarSourceDto,
} from '@bzim/types';

import {
    addCalendarFeed,
    addIgnoreRule,
    disconnectCalendar,
    fetchCalendar,
    fetchCalendarEvents,
    fetchCalendarFeeds,
    fetchIgnoreRules,
    removeCalendarFeed,
    removeIgnoreRule,
    syncCalendar,
    syncCalendarFeeds,
    updateCalendarSource,
} from '@/lib/api/calendar';
import { queryKeys } from '@/lib/query-keys';

export function useCalendar(): UseQueryResult<CalendarConnectionDto | null> {
    return useQuery({ queryKey: queryKeys.calendar.connection, queryFn: fetchCalendar });
}

/** Anything that changes the connection or its events also changes what availability shows. */
function invalidateCalendar(client: ReturnType<typeof useQueryClient>): void {
    void client.invalidateQueries({ queryKey: queryKeys.calendar.all });
    void client.invalidateQueries({ queryKey: queryKeys.availability.mineAll });
    void client.invalidateQueries({ queryKey: ['availability', 'group'] });
}

export function useDisconnectCalendar(): UseMutationResult<void, Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: disconnectCalendar,
        onSuccess: () => {
            client.setQueryData(queryKeys.calendar.connection, null);
            invalidateCalendar(client);
        },
    });
}

export function useUpdateCalendarSource(): UseMutationResult<
    CalendarSourceDto,
    Error,
    { sourceId: string; enabled: boolean }
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ sourceId, enabled }) => updateCalendarSource(sourceId, enabled),
        onSuccess: () => invalidateCalendar(client),
    });
}

export function useSyncCalendar(): UseMutationResult<CalendarConnectionDto, Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: syncCalendar,
        // The settings card says what went wrong, with the wait when it was too soon.
        meta: { silent: true },
        onSuccess: (connection) => {
            client.setQueryData(queryKeys.calendar.connection, connection);
            invalidateCalendar(client);
        },
    });
}

export function useCalendarEvents(from: string, to: string): UseQueryResult<CalendarEventDto[]> {
    return useQuery({
        queryKey: queryKeys.calendar.events(from, to),
        queryFn: () => fetchCalendarEvents(from, to),
    });
}

export function useIgnoreRules(): UseQueryResult<CalendarIgnoreRuleDto[]> {
    return useQuery({ queryKey: queryKeys.calendar.rules, queryFn: fetchIgnoreRules });
}

export function useAddIgnoreRule(): UseMutationResult<
    CalendarIgnoreRuleDto,
    Error,
    CalendarIgnoreRuleInput
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: addIgnoreRule,
        onSuccess: () => invalidateCalendar(client),
    });
}

export function useRemoveIgnoreRule(): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: removeIgnoreRule,
        onSuccess: () => invalidateCalendar(client),
    });
}

/** The calendars read through a link (Apple, Outlook, any feed). */
export function useCalendarFeeds(): UseQueryResult<CalendarFeedDto[]> {
    return useQuery({ queryKey: queryKeys.calendar.feeds, queryFn: fetchCalendarFeeds });
}

export function useAddCalendarFeed(): UseMutationResult<
    CalendarFeedDto,
    Error,
    AddCalendarFeedInput
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: addCalendarFeed,
        // The form says why a link was refused, or how long to wait.
        meta: { silent: true },
        onSuccess: () => invalidateCalendar(client),
    });
}

export function useSyncCalendarFeeds(): UseMutationResult<CalendarFeedDto[], Error, void> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: syncCalendarFeeds,
        meta: { silent: true },
        onSuccess: (feeds) => {
            client.setQueryData(queryKeys.calendar.feeds, feeds);
            invalidateCalendar(client);
        },
    });
}

export function useRemoveCalendarFeed(): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: removeCalendarFeed,
        onSuccess: () => invalidateCalendar(client),
    });
}
