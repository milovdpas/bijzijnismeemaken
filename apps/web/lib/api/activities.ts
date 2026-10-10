import { API_ENDPOINTS } from '@bzim/types';
import type {
    ActivityDetailDto,
    ActivityInput,
    ActivityLabel,
    ActivityListingDto,
} from '@bzim/types';

import { request } from './client';

export interface ActivityFilters {
    label?: ActivityLabel;
    sort: 'next' | 'newest';
}

export function fetchActivities(
    groupId: string,
    filters: ActivityFilters,
): Promise<ActivityListingDto[]> {
    return request<ActivityListingDto[]>(API_ENDPOINTS.ACTIVITIES.LIST(groupId), {
        query: { label: filters.label, sort: filters.sort },
    });
}

export function fetchActivity(groupId: string, activityId: string): Promise<ActivityDetailDto> {
    return request<ActivityDetailDto>(API_ENDPOINTS.ACTIVITIES.DETAIL(groupId, activityId));
}

export function createActivity(groupId: string, input: ActivityInput): Promise<ActivityDetailDto> {
    return request<ActivityDetailDto>(API_ENDPOINTS.ACTIVITIES.CREATE(groupId), {
        method: 'POST',
        body: input,
    });
}

export function updateActivity(
    groupId: string,
    activityId: string,
    patch: Partial<ActivityInput>,
): Promise<ActivityDetailDto> {
    return request<ActivityDetailDto>(API_ENDPOINTS.ACTIVITIES.DETAIL(groupId, activityId), {
        method: 'PATCH',
        body: patch,
    });
}
