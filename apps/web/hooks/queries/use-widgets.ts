'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { GroupWidgetDto, WidgetConfig, WidgetSpec } from '@bzim/types';

import {
    addWidget,
    fetchWidgets,
    removeWidget,
    reorderWidgets,
    restoreDefaultWidgets,
    updateWidget,
} from '@/lib/api/widgets';
import { queryKeys } from '@/lib/query-keys';

export function useWidgets(groupId: string): UseQueryResult<GroupWidgetDto[]> {
    return useQuery({
        queryKey: queryKeys.widgets(groupId),
        queryFn: () => fetchWidgets(groupId),
    });
}

/** Every change ends with the list refetched; the ones that answer with the list seed it first. */
function useWidgetChange<TArgs, TResult>(
    groupId: string,
    action: (args: TArgs) => Promise<TResult>,
    seeds: (result: TResult) => GroupWidgetDto[] | null,
): UseMutationResult<TResult, Error, TArgs> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: (result) => {
            const list = seeds(result);
            if (list !== null) client.setQueryData(queryKeys.widgets(groupId), list);
            void client.invalidateQueries({ queryKey: queryKeys.widgets(groupId) });
        },
    });
}

export function useAddWidget(
    groupId: string,
): UseMutationResult<GroupWidgetDto, Error, WidgetSpec> {
    return useWidgetChange(
        groupId,
        (spec: WidgetSpec) => addWidget(groupId, spec),
        () => null,
    );
}

export function useUpdateWidget(
    groupId: string,
): UseMutationResult<GroupWidgetDto, Error, { widgetId: string; config: WidgetConfig }> {
    return useWidgetChange(
        groupId,
        ({ widgetId, config }: { widgetId: string; config: WidgetConfig }) =>
            updateWidget(groupId, widgetId, config),
        () => null,
    );
}

export function useRemoveWidget(groupId: string): UseMutationResult<void, Error, string> {
    return useWidgetChange(
        groupId,
        (widgetId: string) => removeWidget(groupId, widgetId),
        () => null,
    );
}

/** The new order is shown at once and sent; the API's answer replaces it, or the refetch corrects it. */
export function useReorderWidgets(
    groupId: string,
): UseMutationResult<GroupWidgetDto[], Error, string[]> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (widgetIds: string[]) => reorderWidgets(groupId, widgetIds),
        onMutate: (widgetIds) => {
            const current = client.getQueryData<GroupWidgetDto[]>(queryKeys.widgets(groupId));
            if (current !== undefined) {
                const byId = new Map(current.map((widget) => [widget.id, widget]));
                client.setQueryData(
                    queryKeys.widgets(groupId),
                    widgetIds.flatMap((id) => byId.get(id) ?? []),
                );
            }
        },
        onSuccess: (list) => client.setQueryData(queryKeys.widgets(groupId), list),
        onSettled: () => void client.invalidateQueries({ queryKey: queryKeys.widgets(groupId) }),
    });
}

export function useRestoreDefaultWidgets(
    groupId: string,
): UseMutationResult<GroupWidgetDto[], Error, void> {
    return useWidgetChange(
        groupId,
        () => restoreDefaultWidgets(groupId),
        (list) => list,
    );
}
