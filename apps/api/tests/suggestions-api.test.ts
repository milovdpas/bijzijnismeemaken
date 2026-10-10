import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, DateMode, Daypart, Weekday } from '@bzim/types';
import type { SuggestionsResponse } from '@bzim/types';

import { sessionFor } from './support/auth';
import { asUser, data } from './support/client';
import {
    seedActivity,
    seedBlock,
    seedGroup,
    seedInterest,
    seedMember,
    seedOccurrence,
    seedRule,
    seedUser,
} from './support/factories';

// Two weeks from Monday 2026-11-02.
const FROM = '2026-11-02';

describe('GET …/activities/:id/suggestions', () => {
    it('ranks the dates an activity allows by how many of the "in" people are free', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const anna = await seedUser();
        await seedMember(group, anna);
        const bob = await seedUser();
        await seedMember(group, bob);
        const activity = await seedActivity(group, owner, {
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
            preferredDayparts: [Daypart.EVENING],
        });
        await seedInterest(activity, anna);
        await seedInterest(activity, bob);
        // Anna is away on the 6th; Bob never on Friday evenings until the 8th.
        await seedBlock(anna, '2026-11-06', Daypart.EVENING);
        await seedRule(bob, Weekday.FRIDAY, Daypart.EVENING, { validUntil: '2026-11-08' });
        // The group bowls on the 13th in the evening.
        const other = await seedActivity(group, owner, { title: 'Bowlen' });
        await seedOccurrence(other, owner, { date: '2026-11-13', startTime: '20:00' });
        const client = asUser((await sessionFor(owner)).accessToken);

        const response = await client.get(
            `${API_ENDPOINTS.ACTIVITIES.SUGGESTIONS(group.id, activity.id)}?from=${FROM}&weeks=2`,
        );

        expect(response.status).toBe(200);
        const body = data<SuggestionsResponse>(response);
        expect(body.memberIds.sort()).toEqual([anna.id, bob.id].sort());
        expect(body.total).toBe(2);
        expect(
            body.items.map((item) => [item.date, item.daypart, item.freeCount, item.conflict]),
        ).toEqual([
            ['2026-11-13', Daypart.EVENING, 2, true],
            ['2026-11-06', Daypart.EVENING, 0, false],
        ]);
        expect(body.items[1]?.busyIds.sort()).toEqual([anna.id, bob.id].sort());
    });

    it('takes explicit members, ignores outsiders, and uses every day and daypart for a free-form idea', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const anna = await seedUser();
        await seedMember(group, anna);
        const outsider = await seedUser();
        const activity = await seedActivity(group, owner, { startTime: '14:00' });
        const client = asUser((await sessionFor(owner)).accessToken);

        const body = data<SuggestionsResponse>(
            await client.get(
                `${API_ENDPOINTS.ACTIVITIES.SUGGESTIONS(group.id, activity.id)}?from=${FROM}&weeks=1&memberIds=${anna.id},${outsider.id}`,
            ),
        );
        expect(body.memberIds).toEqual([anna.id]);
        // A start time of 14:00 narrows the dayparts to the afternoon: seven days, one daypart each.
        expect(body.total).toBe(7);
        expect(body.items.every((item) => item.daypart === Daypart.AFTERNOON)).toBe(true);
        expect(body.items[0]?.date).toBe(FROM);
    });

    it('offers a specific date only, and nothing when it has passed', async () => {
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const activity = await seedActivity(group, owner, {
            dateMode: DateMode.SPECIFIC,
            specificDate: '2026-11-10',
        });
        const client = asUser((await sessionFor(owner)).accessToken);
        const url = API_ENDPOINTS.ACTIVITIES.SUGGESTIONS(group.id, activity.id);

        const inRange = data<SuggestionsResponse>(await client.get(`${url}?from=${FROM}&weeks=2`));
        expect(inRange.items.map((item) => item.date)).toEqual([
            '2026-11-10',
            '2026-11-10',
            '2026-11-10',
        ]);

        const later = data<SuggestionsResponse>(await client.get(`${url}?from=2026-11-11&weeks=2`));
        expect(later.items).toEqual([]);
        expect(later.total).toBe(0);

        expect((await client.get(`${url}?weeks=99`)).status).toBe(422);
    });
});
