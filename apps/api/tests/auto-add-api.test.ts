import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, Daypart, OccurrenceStatus } from '@bzim/types';
import type { MeResponse, OccurrenceDto } from '@bzim/types';

import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { mailer } from '../src/app/modules/mail';
import { CalendarProviderFactory } from '../src/app/modules/calendar/CalendarProviderFactory';
import { FixtureCalendarProvider } from '../src/app/modules/calendar/FixtureCalendarProvider';
import { sessionFor } from './support/auth';
import { asUser, data } from './support/client';
import { seedActivity, seedGroup, seedMember, seedUser } from './support/factories';

const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

afterEach(() => {
    vi.restoreAllMocks();
});

async function world() {
    vi.spyOn(mailer, 'send').mockResolvedValue();
    const fixture = new FixtureCalendarProvider();
    vi.spyOn(CalendarProviderFactory, 'for').mockReturnValue(fixture);
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner, { name: 'Vrienden' });
    const anna = await seedUser({ displayName: 'Anna' });
    await seedMember(group, anna);
    const bob = await seedUser({ displayName: 'Bob' });
    await seedMember(group, bob);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAnna = asUser((await sessionFor(anna)).accessToken);
    const activity = await seedActivity(group, owner, {
        title: 'Klaverjassen',
        durationMinutes: 180,
    });
    return { fixture, owner, group, anna, bob, asOwner, asAnna, activity };
}

/** Anna connects with the write scope, which switches auto-add on for her. */
async function connectForWriting(w: Awaited<ReturnType<typeof world>>): Promise<void> {
    w.fixture.exchanged = {
        ...w.fixture.exchanged,
        grantedScopes: [...w.fixture.exchanged.grantedScopes, WRITE_SCOPE],
    };
    const start = await w.asAnna.get(`${API_ENDPOINTS.ME.CALENDAR_CONNECT}?scope=readwrite`);
    const state = new URL(start.headers.location as string).searchParams.get('state') ?? '';
    await w.asAnna.get(`${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state}&code=ok`);
    expect(data<MeResponse>(await w.asAnna.get(API_ENDPOINTS.ME.ROOT)).autoAddToCalendar).toBe(
        true,
    );
}

describe('auto-add to the calendar', () => {
    it('writes, moves and removes the event with the occurrence, for those who opted in', async () => {
        const w = await world();
        await connectForWriting(w);
        const occurrencesUrl = API_ENDPOINTS.ACTIVITIES.OCCURRENCES(w.group.id, w.activity.id);

        const planned = data<OccurrenceDto>(
            await w.asOwner.post(occurrencesUrl, {
                date: '2026-11-20',
                daypart: null,
                startTime: '19:30',
                notes: 'Bij Milo',
                participantIds: [w.anna.id, w.bob.id],
            }),
        );
        // Only Anna's calendar is written: Bob never opted in.
        expect(w.fixture.written).toHaveLength(1);
        expect(w.fixture.written[0]).toMatchObject({
            calendarId: 'primary',
            input: { title: 'Klaverjassen' },
        });
        expect(w.fixture.written[0]?.input.startAt?.toISOString()).toBe('2026-11-20T18:30:00.000Z');
        expect(w.fixture.written[0]?.input.endAt?.toISOString()).toBe('2026-11-20T21:30:00.000Z');
        expect(w.fixture.written[0]?.input.description).toContain('Vrienden · Klaverjassen');
        const annaRow = await OccurrenceParticipant.findOneByOrFail({
            occurrenceId: planned.id,
            userId: w.anna.id,
        });
        expect(annaRow.calendarEventId).toBe('fixture-event-1');
        expect(annaRow.calendarConnectionId).not.toBeNull();

        // A re-date updates the same event; an all-day one has dates, not instants.
        const url = `${occurrencesUrl}/${planned.id}`;
        await w.asOwner.patch(url, { date: '2026-11-21', startTime: null, daypart: null });
        expect(w.fixture.written).toHaveLength(2);
        expect(w.fixture.written[1]).toMatchObject({
            eventId: 'fixture-event-1',
            input: { startDate: '2026-11-21', endDate: '2026-11-22', startAt: null },
        });

        // Dropping Anna deletes hers; the row's ids are cleared.
        await w.asOwner.patch(url, { participantIds: [w.bob.id] });
        expect(w.fixture.deleted).toEqual([{ calendarId: 'primary', eventId: 'fixture-event-1' }]);
        expect(
            await OccurrenceParticipant.countBy({ occurrenceId: planned.id, userId: w.anna.id }),
        ).toBe(0);

        // Back in: a fresh event. Cancelling takes it out again.
        await w.asOwner.patch(url, { participantIds: [w.anna.id, w.bob.id] });
        expect(w.fixture.written).toHaveLength(3);
        await w.asOwner.patch(url, { status: OccurrenceStatus.CANCELLED });
        expect(w.fixture.deleted).toHaveLength(2);
        const cleared = await OccurrenceParticipant.findOneByOrFail({
            occurrenceId: planned.id,
            userId: w.anna.id,
        });
        expect(cleared.calendarEventId).toBeNull();
    });

    it('removes the events when an occurrence is deleted and when the person leaves the group', async () => {
        const w = await world();
        await connectForWriting(w);
        const occurrencesUrl = API_ENDPOINTS.ACTIVITIES.OCCURRENCES(w.group.id, w.activity.id);
        const first = data<OccurrenceDto>(
            await w.asOwner.post(occurrencesUrl, {
                date: '2026-11-20',
                daypart: Daypart.EVENING,
                participantIds: [w.anna.id],
            }),
        );
        await w.asOwner.delete(`${occurrencesUrl}/${first.id}`);
        expect(w.fixture.deleted).toHaveLength(1);

        const second = data<OccurrenceDto>(
            await w.asOwner.post(occurrencesUrl, {
                date: '2026-11-27',
                daypart: Daypart.EVENING,
                participantIds: [w.anna.id],
            }),
        );
        expect(w.fixture.written).toHaveLength(2);
        await w.asAnna.post(API_ENDPOINTS.GROUPS.LEAVE(w.group.id));
        expect(w.fixture.deleted).toHaveLength(2);
        expect(await OccurrenceParticipant.countBy({ occurrenceId: second.id })).toBe(0);
    });

    it('writes nothing without the write scope or with the setting off', async () => {
        const w = await world();
        const occurrencesUrl = API_ENDPOINTS.ACTIVITIES.OCCURRENCES(w.group.id, w.activity.id);
        // Read-only connection, setting on by hand: no write scope, so nothing.
        const start = await w.asAnna.get(API_ENDPOINTS.ME.CALENDAR_CONNECT);
        const state = new URL(start.headers.location as string).searchParams.get('state') ?? '';
        await w.asAnna.get(`${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state}&code=ok`);
        await w.asAnna.patch(API_ENDPOINTS.ME.ROOT, { autoAddToCalendar: true });
        await w.asOwner.post(occurrencesUrl, {
            date: '2026-11-20',
            daypart: Daypart.EVENING,
            participantIds: [w.anna.id],
        });
        expect(w.fixture.written).toHaveLength(0);
    });
});
