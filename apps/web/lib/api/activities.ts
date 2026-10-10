import { API_ENDPOINTS } from '@bzim/types';
import type {
    ActivityDetailDto,
    ActivityInput,
    ActivityLabel,
    ActivityListingDto,
    OccurrenceDto,
    OccurrenceInput,
    OccurrenceUpdateInput,
    SuggestionsResponse,
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

export function deleteActivity(groupId: string, activityId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.ACTIVITIES.DETAIL(groupId, activityId), {
        method: 'DELETE',
    });
}

/** "I'm in" or "not after all" for the caller. */
export function setMyInterest(groupId: string, activityId: string, inFor: boolean): Promise<void> {
    return request<void>(API_ENDPOINTS.ACTIVITIES.INTEREST(groupId, activityId), {
        method: inFor ? 'PUT' : 'DELETE',
    });
}

/** The same for another member; admins only. */
export function setMemberInterest(
    groupId: string,
    activityId: string,
    userId: string,
    inFor: boolean,
): Promise<void> {
    return request<void>(API_ENDPOINTS.ACTIVITIES.INTEREST_OF(groupId, activityId, userId), {
        method: inFor ? 'PUT' : 'DELETE',
    });
}

export function planOccurrence(
    groupId: string,
    activityId: string,
    input: OccurrenceInput,
): Promise<OccurrenceDto> {
    return request<OccurrenceDto>(API_ENDPOINTS.ACTIVITIES.OCCURRENCES(groupId, activityId), {
        method: 'POST',
        body: input,
    });
}

export function updateOccurrence(
    groupId: string,
    activityId: string,
    occurrenceId: string,
    patch: OccurrenceUpdateInput,
): Promise<OccurrenceDto> {
    return request<OccurrenceDto>(
        API_ENDPOINTS.ACTIVITIES.OCCURRENCE(groupId, activityId, occurrenceId),
        { method: 'PATCH', body: patch },
    );
}

export function deleteOccurrence(
    groupId: string,
    activityId: string,
    occurrenceId: string,
): Promise<void> {
    return request<void>(API_ENDPOINTS.ACTIVITIES.OCCURRENCE(groupId, activityId, occurrenceId), {
        method: 'DELETE',
    });
}

/** Ranked dates for the planning dialog, for the given people. */
export function fetchSuggestions(
    groupId: string,
    activityId: string,
    memberIds: string[],
): Promise<SuggestionsResponse> {
    return request<SuggestionsResponse>(API_ENDPOINTS.ACTIVITIES.SUGGESTIONS(groupId, activityId), {
        query: { memberIds: memberIds.join(',') },
    });
}
