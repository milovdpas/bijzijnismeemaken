import { API_ENDPOINTS } from '@bzim/types';
import type {
    GroupDetailResponse,
    GroupInput,
    GroupListingResponse,
    JoinPreviewResponse,
    Paginated,
    PublicGroupResponse,
} from '@bzim/types';

import { request } from './client';

export function fetchGroups(): Promise<GroupListingResponse[]> {
    return request<GroupListingResponse[]>(API_ENDPOINTS.GROUPS.LIST);
}

export function fetchGroup(groupId: string): Promise<GroupDetailResponse> {
    return request<GroupDetailResponse>(API_ENDPOINTS.GROUPS.DETAIL(groupId));
}

export function createGroup(input: GroupInput): Promise<GroupDetailResponse> {
    return request<GroupDetailResponse>(API_ENDPOINTS.GROUPS.CREATE, {
        method: 'POST',
        body: input,
    });
}

export function searchPublicGroups(
    q: string,
    page: number,
): Promise<Paginated<PublicGroupResponse>> {
    return request<Paginated<PublicGroupResponse>>(API_ENDPOINTS.GROUPS.PUBLIC, {
        query: { q: q === '' ? undefined : q, page },
    });
}

export function joinGroup(groupId: string): Promise<GroupDetailResponse> {
    return request<GroupDetailResponse>(API_ENDPOINTS.GROUPS.JOIN(groupId), { method: 'POST' });
}

export function previewInvite(token: string): Promise<JoinPreviewResponse> {
    return request<JoinPreviewResponse>(API_ENDPOINTS.JOIN.BY_TOKEN(token));
}

export function joinByToken(token: string): Promise<GroupDetailResponse> {
    return request<GroupDetailResponse>(API_ENDPOINTS.JOIN.BY_TOKEN(token), { method: 'POST' });
}
