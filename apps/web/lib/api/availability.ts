import { API_ENDPOINTS } from '@bzim/types';
import type {
    GroupAvailabilityResponse,
    MyAvailabilityResponse,
    UnavailabilityInput,
    UnavailabilityRuleDto,
    UnavailabilityRuleInput,
} from '@bzim/types';

import { request } from './client';

export function fetchMyAvailability(from: string, to: string): Promise<MyAvailabilityResponse> {
    return request<MyAvailabilityResponse>(API_ENDPOINTS.ME.AVAILABILITY, { query: { from, to } });
}

export function fetchGroupAvailability(
    groupId: string,
    from: string,
    to: string,
    activityId?: string,
): Promise<GroupAvailabilityResponse> {
    return request<GroupAvailabilityResponse>(API_ENDPOINTS.GROUPS.AVAILABILITY(groupId), {
        query: { from, to, activityId },
    });
}

/** Blocks a date's daypart, or with `free` frees it from a weekly rule. Idempotent. */
export function putBlock(input: UnavailabilityInput): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.UNAVAILABILITY, { method: 'PUT', body: input });
}

/** Removes whichever one-off is on that daypart, block or freed day. */
export function deleteBlock(input: UnavailabilityInput): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.UNAVAILABILITY, { method: 'DELETE', body: input });
}

export function fetchRules(): Promise<UnavailabilityRuleDto[]> {
    return request<UnavailabilityRuleDto[]>(API_ENDPOINTS.ME.UNAVAILABILITY_RULES);
}

export function createRule(input: UnavailabilityRuleInput): Promise<UnavailabilityRuleDto> {
    return request<UnavailabilityRuleDto>(API_ENDPOINTS.ME.UNAVAILABILITY_RULES, {
        method: 'POST',
        body: input,
    });
}

export function deleteRule(ruleId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.UNAVAILABILITY_RULE(ruleId), { method: 'DELETE' });
}
