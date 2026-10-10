import { API_ENDPOINTS } from '@bzim/types';
import type { GroupDetailResponse, GroupInviteDto, InviteRequest } from '@bzim/types';

import { request } from './client';

export function inviteByHandle(groupId: string, handle: string): Promise<GroupInviteDto> {
    const body: InviteRequest = { handle };
    return request<GroupInviteDto>(API_ENDPOINTS.GROUPS.INVITES(groupId), {
        method: 'POST',
        body,
    });
}

export function fetchGroupInvites(groupId: string): Promise<GroupInviteDto[]> {
    return request<GroupInviteDto[]>(API_ENDPOINTS.GROUPS.INVITES(groupId));
}

export function cancelInvite(groupId: string, inviteId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.GROUPS.INVITE(groupId, inviteId), { method: 'DELETE' });
}

export function fetchMyInvites(): Promise<GroupInviteDto[]> {
    return request<GroupInviteDto[]>(API_ENDPOINTS.INVITES.LIST);
}

export function acceptInvite(inviteId: string): Promise<GroupDetailResponse> {
    return request<GroupDetailResponse>(API_ENDPOINTS.INVITES.ACCEPT(inviteId), {
        method: 'POST',
    });
}

export function declineInvite(inviteId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.INVITES.DECLINE(inviteId), { method: 'POST' });
}
