import { API_ENDPOINTS } from '@bzim/types';
import type { GroupInviteDto, InviteRequest } from '@bzim/types';

import { request } from './client';

export function inviteByHandle(groupId: string, handle: string): Promise<GroupInviteDto> {
    const body: InviteRequest = { handle };
    return request<GroupInviteDto>(API_ENDPOINTS.GROUPS.INVITES(groupId), {
        method: 'POST',
        body,
    });
}
