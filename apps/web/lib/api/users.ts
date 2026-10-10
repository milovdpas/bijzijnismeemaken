import { API_ENDPOINTS } from '@bzim/types';
import type {
    ChangePasswordRequest,
    HandleAvailableResponse,
    MeResponse,
    UpdateMeRequest,
    UserSummary,
} from '@bzim/types';

import { request } from './client';

export function fetchMe(): Promise<MeResponse> {
    return request<MeResponse>(API_ENDPOINTS.ME.ROOT);
}

export function updateMe(patch: UpdateMeRequest): Promise<MeResponse> {
    return request<MeResponse>(API_ENDPOINTS.ME.ROOT, { method: 'PATCH', body: patch });
}

export function changePassword(body: ChangePasswordRequest): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.PASSWORD, { method: 'PATCH', body });
}

export function deleteMe(): Promise<void> {
    return request<void>(API_ENDPOINTS.ME.ROOT, { method: 'DELETE' });
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
    const result = await request<HandleAvailableResponse>(API_ENDPOINTS.USERS.HANDLE_AVAILABLE, {
        query: { handle },
    });
    return result.available;
}

export function searchUsers(q: string): Promise<UserSummary[]> {
    return request<UserSummary[]>(API_ENDPOINTS.USERS.SEARCH, { query: { q } });
}
