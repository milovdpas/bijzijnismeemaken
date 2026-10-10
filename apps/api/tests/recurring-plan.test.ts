import { describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, DateMode, Weekday } from '@bzim/types';

import { mailer } from '../src/app/modules/mail';
import { sessionFor } from './support/auth';
import { asUser, error } from './support/client';
import { seedActivity, seedGroup, seedUser } from './support/factories';

describe('recurring activities', () => {
    it('can hold several open occurrences at once', async () => {
        vi.spyOn(mailer, 'send').mockResolvedValue();
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const activity = await seedActivity(group, owner, {
            isRecurring: true,
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
        });
        const client = asUser((await sessionFor(owner)).accessToken);
        const url = API_ENDPOINTS.ACTIVITIES.OCCURRENCES(group.id, activity.id);

        const first = await client.post(url, { date: '2026-11-06', participantIds: [] });
        const second = await client.post(url, { date: '2026-11-13', participantIds: [] });
        expect([first.status, second.status]).toEqual([201, 201]);
        expect(second.status === 201 ? null : error(second).details).toBeNull();
    });
});
