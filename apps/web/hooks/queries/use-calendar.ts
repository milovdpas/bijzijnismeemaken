'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    CalendarConnectionDto,
    CalendarEventDto,
    CalendarIgnoreRuleDto,
    CalendarIgnoreRuleInput,
    CalendarSourceDto,
} from '@bzim/types';

import {
    addIgnoreRule,
    disconnectCalendar,
    fetchCalendar,
    fetchCalendarEvents,
    fetchIgnoreRules,
    removeIgnoreRule,
    syncCalendar,
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
