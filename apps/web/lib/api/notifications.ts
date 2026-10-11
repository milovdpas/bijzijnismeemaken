import { API_ENDPOINTS } from '@bzim/types';
import type {
    CreatePushSubscriptionRequest,
    NotificationSettingDto,
    NotificationType,
    PushSubscriptionDto,
    PushSubscriptionsResponse,
    UpdateNotificationSettingRequest,
} from '@bzim/types';

import { request } from './client';

export function fetchNotificationSettings(): Promise<NotificationSettingDto[]> {
    return request<NotificationSettingDto[]>(API_ENDPOINTS.ME.NOTIFICATION_SETTINGS);
}

export function updateNotificationSetting(
    type: NotificationType,
    channels: UpdateNotificationSettingRequest,
): Promise<NotificationSettingDto> {
    return request<NotificationSettingDto>(API_ENDPOINTS.ME.NOTIFICATION_SETTING(type), {
        method: 'PUT',
        body: channels,
    });
}

export function fetchPushSubscriptions(): Promise<PushSubscriptionsResponse> {
    return request<PushSubscriptionsResponse>(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS);
}

export function createPushSubscription(
    input: CreatePushSubscriptionRequest,
): Promise<PushSubscriptionDto> {
    return request<PushSubscriptionDto>(API_ENDPOINTS.ME.PUSH_SUBSCRIPTIONS, {
        method: 'POST',
        body: input,
    });
}

export function deletePushSubscription(subscriptionId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.PUSH_SUBSCRIPTION(subscriptionId), {
        method: 'DELETE',
    });
}
