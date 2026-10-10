import { API_ENDPOINTS } from '@bzim/types';
import type { GroupMemberResponse, GroupRole } from '@bzim/types';

import { request } from './client';

export function fetchMembers(groupId: string): Promise<GroupMemberResponse[]> {
    return request<GroupMemberResponse[]>(API_ENDPOINTS.GROUPS.MEMBERS(groupId));
}

export function changeMemberRole(groupId: string, userId: string, role: GroupRole): Promise<void> {
    return request<void>(API_ENDPOINTS.GROUPS.MEMBER(groupId, userId), {
        method: 'PATCH',
        body: { role },
    });
}

export function removeMember(groupId: string, userId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.GROUPS.MEMBER(groupId, userId), { method: 'DELETE' });
}

export function transferOwnership(groupId: string, userId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(groupId), {
        method: 'POST',
        body: { userId },
    });
}

export function leaveGroup(groupId: string): Promise<void> {
    return request<void>(API_ENDPOINTS.GROUPS.LEAVE(groupId), { method: 'POST' });
}
