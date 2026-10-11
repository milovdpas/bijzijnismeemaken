import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, Locale, OccurrenceStatus } from '@bzim/types';

import ActivityOccurrence from '../src/app/domain/models/ActivityOccurrence.entity';
import { mailer } from '../src/app/infrastructure/modules/mail';
import type { MailMessage } from '../src/app/infrastructure/modules/mail';
import { CalendarWriteService } from '../src/app/domain/services/CalendarWriteService';
import { sessionFor } from './support/auth';
import { asUser } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

function outbox(): MailMessage[] {
    const sent: MailMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        sent.push(message);
        return Promise.resolve();
    });
    return sent;
}

/** A group with one planned and one done occurrence; Anna and Bob were told about the planned one. */
async function world() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner, { name: 'Vrienden' });
    const anna = await seedUser({ locale: Locale.EN });
    const bob = await seedUser();
    await seedMember(group, anna);
    await seedMember(group, bob);
    const activity = await seedActivity(group, owner, { title: 'Kaartavond' });
    const planned = await seedOccurrence(activity, owner, { date: '2026-11-06' });
    for (const user of [anna, bob]) {
        const row = await seedParticipant(planned, user);
        row.notifiedAt = new Date();
        row.notifiedForDate = '2026-11-06';
        await row.save();
    }
    const done = await seedOccurrence(activity, owner, {
        date: '2026-10-01',
        status: OccurrenceStatus.DONE,
    });
    await seedParticipant(done, anna);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    return { owner, group, anna, bob, activity, planned, asOwner };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('deleting what has been planned', () => {
    it('an activity: the people who were told hear it is off, and their calendars are cleared', async () => {
        const sent = outbox();
        const removed = vi.spyOn(CalendarWriteService, 'remove').mockResolvedValue();
        const w = await world();

        const response = await w.asOwner.delete(
            API_ENDPOINTS.ACTIVITIES.DETAIL(w.group.id, w.activity.id),
        );

        expect(response.status).toBe(204);
        expect(sent.map((mail) => mail.to).sort()).toEqual([w.anna.email, w.bob.email].sort());
        expect(sent.find((mail) => mail.to === w.anna.email)?.subject).toBe(
            'Kaartavond on Friday 6 November is cancelled',
        );
        // The planned occurrence's rows, not the done one's.
        expect(removed).toHaveBeenCalledTimes(1);
        expect(removed.mock.calls[0]?.[0].map((row) => row.occurrenceId)).toEqual([
            w.planned.id,
            w.planned.id,
        ]);
        expect(await ActivityOccurrence.countBy({ activityId: w.activity.id })).toBe(0);
    });

    it('a group: the same, for every activity in it', async () => {
        const sent = outbox();
        const removed = vi.spyOn(CalendarWriteService, 'remove').mockResolvedValue();
        const w = await world();

        const response = await w.asOwner.delete(API_ENDPOINTS.GROUPS.DETAIL(w.group.id));

        expect(response.status).toBe(204);
        expect(sent.map((mail) => mail.to).sort()).toEqual([w.anna.email, w.bob.email].sort());
        expect(removed).toHaveBeenCalledTimes(1);
        expect(await ActivityOccurrence.count()).toBe(0);
    });
});
