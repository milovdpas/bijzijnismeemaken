'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
    CreatePushSubscriptionRequest,
    NotificationSettingDto,
    NotificationType,
    PushSubscriptionDto,
    PushSubscriptionsResponse,
    UpdateNotificationSettingRequest,
} from '@bzim/types';

import {
    createPushSubscription,
    deletePushSubscription,
    fetchNotificationSettings,
    fetchPushSubscriptions,
    updateNotificationSetting,
} from '@/lib/api/notifications';
import { queryKeys } from '@/lib/query-keys';

export function useNotificationSettings(): UseQueryResult<NotificationSettingDto[]> {
    return useQuery({
        queryKey: queryKeys.notifications.settings,
        queryFn: fetchNotificationSettings,
    });
}

/** Optimistic: the switch flips at once and flips back if the server disagrees. */
export function useUpdateNotificationSetting(): UseMutationResult<
    NotificationSettingDto,
    Error,
    { type: NotificationType; channels: UpdateNotificationSettingRequest },
    { previous: NotificationSettingDto[] | undefined }
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ type, channels }) => updateNotificationSetting(type, channels),
        onMutate: async ({ type, channels }) => {
            await client.cancelQueries({ queryKey: queryKeys.notifications.settings });
            const previous = client.getQueryData<NotificationSettingDto[]>(
                queryKeys.notifications.settings,
            );
            client.setQueryData<NotificationSettingDto[]>(
                queryKeys.notifications.settings,
                (rows) => rows?.map((row) => (row.type === type ? { ...row, ...channels } : row)),
            );
            return { previous };
        },
        onError: (_error, _input, context) => {
            client.setQueryData(queryKeys.notifications.settings, context?.previous);
        },
        onSettled: () => {
            void client.invalidateQueries({ queryKey: queryKeys.notifications.settings });
        },
    });
}

export function usePushSubscriptions(): UseQueryResult<PushSubscriptionsResponse> {
    return useQuery({
        queryKey: queryKeys.notifications.push,
        queryFn: fetchPushSubscriptions,
    });
}

export function useCreatePushSubscription(): UseMutationResult<
    PushSubscriptionDto,
    Error,
    CreatePushSubscriptionRequest
> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: createPushSubscription,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.notifications.push });
        },
    });
}

export function useDeletePushSubscription(): UseMutationResult<void, Error, string> {
    const client = useQueryClient();
    return useMutation({
        mutationFn: deletePushSubscription,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: queryKeys.notifications.push });
        },
    });
}
