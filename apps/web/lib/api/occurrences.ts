import { API_ENDPOINTS } from '@bzim/types';
import type { GroupOccurrenceDto } from '@bzim/types';

import { request } from './client';

/** The group's agenda: planned occurrences in a date range, with conflict flags. */
export function fetchGroupOccurrences(
    groupId: string,
    from: string,
    to: string,
): Promise<GroupOccurrenceDto[]> {
    return request<GroupOccurrenceDto[]>(API_ENDPOINTS.GROUPS.OCCURRENCES(groupId), {
        query: { from, to },
    });
}
