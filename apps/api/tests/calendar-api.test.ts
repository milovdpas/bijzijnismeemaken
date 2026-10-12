import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    API_ENDPOINTS,
    CalendarConnectionStatus,
    CalendarEventType,
    CalendarIgnoreRuleKind,
    Daypart,
} from '@bzim/types';
import type {
    CalendarConnectionDto,
    CalendarEventDto,
    CalendarIgnoreRuleDto,
    CalendarSourceDto,
    GroupAvailabilityResponse,
    MeResponse,
    MyAvailabilityResponse,
    WorkerJobResponse,
} from '@bzim/types';

import CalendarConnection from '../src/app/domain/models/CalendarConnection.entity';
import CalendarEvent from '../src/app/domain/models/CalendarEvent.entity';
import OAuthState from '../src/app/domain/models/OAuthState.entity';
import OccurrenceParticipant from '../src/app/domain/models/OccurrenceParticipant.entity';
import { CalendarProviderFactory } from '../src/app/infrastructure/modules/calendar/CalendarProviderFactory';
import { FixtureCalendarProvider } from '../src/app/infrastructure/modules/calendar/FixtureCalendarProvider';
import type { ProviderEvent } from '../src/app/infrastructure/modules/calendar/CalendarProvider';
import { env } from '../src/config/app';
import { sessionFor } from './support/auth';
import { api, asUser, asWorker, data } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

function install(): FixtureCalendarProvider {
    const fixture = new FixtureCalendarProvider();
    vi.spyOn(CalendarProviderFactory, 'for').mockReturnValue(fixture);
    return fixture;
}

afterEach(() => {
    vi.restoreAllMocks();
});

function timed(
    id: string,
    startIso: string,
    endIso: string,
    extra: Partial<ProviderEvent> = {},
): ProviderEvent {
    return {
        id,
        recurringEventId: null,
        title: `Event ${id}`,
        startAt: new Date(startIso),
        endAt: new Date(endIso),
        allDay: false,
        startDate: null,
        endDate: null,
        transparent: false,
        eventType: CalendarEventType.DEFAULT,
        ...extra,
    };
}

/** The connect round trip through the fixture: start, then the callback with the state Google would echo. */
async function connect(
    client: ReturnType<typeof asUser>,
    scope = 'read',
): Promise<CalendarConnectionDto> {
    const start = await client.get(`${API_ENDPOINTS.ME.CALENDAR_CONNECT}?scope=${scope}`);
    expect(start.status).toBe(302);
    const state = new URL(start.headers.location as string).searchParams.get('state') ?? '';
    const back = await client.get(
        `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state}&code=ok`,
    );
    expect(back.status).toBe(302);
    expect(back.headers.location).toBe(`${env.appUrl}/settings/calendar?connected=1`);
    return data<CalendarConnectionDto>(await client.get(API_ENDPOINTS.ME.CALENDAR));
}

describe('calendar connection', () => {
    it('connects through the provider, lists calendars with the primary on, and replaces an old connection', async () => {
        const fixture = install();
        fixture.calendars.push({
            id: 'work',
            name: 'Werk',
            primary: false,
            timeZone: 'Europe/Amsterdam',
        });
        const user = await seedUser();
        const asMe = asUser((await sessionFor(user)).accessToken);
        expect(
            data<CalendarConnectionDto | null>(await asMe.get(API_ENDPOINTS.ME.CALENDAR)),
        ).toBeNull();

        // A connect from the setup step marks it seen and comes back where it was asked to.
        const started = await asMe.get(
            `${API_ENDPOINTS.ME.CALENDAR_CONNECT}?returnTo=/welcome/availability`,
        );
        const stateForStep =
            new URL(started.headers.location as string).searchParams.get('state') ?? '';
        const landed = await asMe.get(
            `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${stateForStep}&code=ok`,
        );
        expect(landed.headers.location).toBe(`${env.appUrl}/welcome/availability`);
        expect(data<MeResponse>(await asMe.get(API_ENDPOINTS.ME.ROOT)).setup).toEqual({
            calendarSeen: true,
            availabilitySeen: false,
        });
        expect(
            data<MeResponse>(await asMe.post(API_ENDPOINTS.ME.SETUP('availability'))).setup,
        ).toEqual({
            calendarSeen: true,
            availabilitySeen: true,
        });
        expect((await asMe.post(API_ENDPOINTS.ME.SETUP('nope'))).status).toBe(422);

        const connection = await connect(asMe);
        expect(connection).toMatchObject({
            accountEmail: 'agenda@example.test',
            status: CalendarConnectionStatus.ACTIVE,
            hasWriteScope: false,
            lastSyncedAt: null,
        });
        expect(
            connection.sources.map((source) => [source.name, source.isPrimary, source.enabled]),
        ).toEqual([
            ['Agenda', true, true],
            ['Werk', false, false],
        ]);
        expect(await OAuthState.count()).toBe(0);

        // An event written through this connection follows it to the next one.
        const group = await seedGroup(user);
        const activity = await seedActivity(group, user);
        const occurrence = await seedOccurrence(activity, user);
        const row = await seedParticipant(occurrence, user);
        await OccurrenceParticipant.update(row.id, {
            calendarEventId: 'evt-1',
            calendarConnectionId: connection.id,
        });

        // Connecting the same account again replaces: one row, the grant kept
        // (Google revokes per account, which would kill the new tokens too).
        fixture.exchanged = {
            ...fixture.exchanged,
            refreshToken: 'second',
            grantedScopes: [
                ...fixture.exchanged.grantedScopes,
                'https://www.googleapis.com/auth/calendar.events',
            ],
        };
        const again = await connect(asMe, 'readwrite');
        expect(again.hasWriteScope).toBe(true);
        expect(await CalendarConnection.countBy({ userId: user.id })).toBe(1);
        expect(fixture.revoked).toEqual([]);
        expect((await CalendarConnection.findOneByOrFail({ userId: user.id })).refreshToken).toBe(
            'second',
        );
        expect(await OccurrenceParticipant.findOneByOrFail({ id: row.id })).toMatchObject({
            calendarEventId: 'evt-1',
            calendarConnectionId: again.id,
        });

        // Another Google account: the old event comes out of the old calendar, the old grant goes.
        fixture.exchanged = {
            ...fixture.exchanged,
            accountEmail: 'werk@example.test',
            refreshToken: 'third',
        };
        const other = await connect(asMe);
        expect(other.accountEmail).toBe('werk@example.test');
        expect(fixture.revoked).toEqual(['second']);
        expect(fixture.deleted).toEqual([{ calendarId: 'primary', eventId: 'evt-1' }]);
        expect(await OccurrenceParticipant.findOneByOrFail({ id: row.id })).toMatchObject({
            calendarEventId: null,
            calendarConnectionId: null,
        });
    });

    it('refuses a callback for another person, a stale state, and a provider failure', async () => {
        install();
        const anna = await seedUser();
        const bob = await seedUser();
        const asAnna = asUser((await sessionFor(anna)).accessToken);
        const asBob = asUser((await sessionFor(bob)).accessToken);

        const start = await asAnna.get(API_ENDPOINTS.ME.CALENDAR_CONNECT);
        const state = new URL(start.headers.location as string).searchParams.get('state') ?? '';
        const stolen = await asBob.get(
            `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state}&code=ok`,
        );
        expect(stolen.headers.location).toBe(`${env.appUrl}/settings/calendar?error=state`);
        // Consumed either way: Anna cannot use it any more.
        const replay = await asAnna.get(
            `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state}&code=ok`,
        );
        expect(replay.headers.location).toBe(`${env.appUrl}/settings/calendar?error=state`);

        const second = await asAnna.get(API_ENDPOINTS.ME.CALENDAR_CONNECT);
        const state2 = new URL(second.headers.location as string).searchParams.get('state') ?? '';
        const failed = await asAnna.get(
            `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=${state2}&code=bad-code`,
        );
        expect(failed.headers.location).toBe(`${env.appUrl}/settings/calendar?error=provider`);
        const cancelled = await asAnna.get(
            `${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}?state=x&error=access_denied`,
        );
        expect(cancelled.headers.location).toBe(`${env.appUrl}/settings/calendar?error=cancelled`);
        expect(
            (await api.get(API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK + '?state=x&code=y')).status,
        ).toBe(401);
    });

    it('syncs the enabled calendars, feeds availability, honours ignore rules, and disconnects clean', async () => {
        const fixture = install();
        fixture.calendars.push({
            id: 'work',
            name: 'Werk',
            primary: false,
            timeZone: 'Europe/Amsterdam',
        });
        // Winter: Amsterdam is UTC+1. Tuesday 2026-11-03.
        fixture.events.set('primary', [
            timed('dentist', '2026-11-03T08:00:00Z', '2026-11-03T09:00:00Z', { title: 'Tandarts' }),
            timed('free', '2026-11-03T13:00:00Z', '2026-11-03T14:00:00Z', { transparent: true }),
            timed('weekly', '2026-11-04T18:00:00Z', '2026-11-04T20:00:00Z', {
                recurringEventId: 'series-x',
                title: 'Voetbal',
            }),
        ]);
        fixture.events.set('work', [
            timed('standup', '2026-11-05T08:00:00Z', '2026-11-05T08:30:00Z'),
        ]);
        const owner = await seedUser();
        const user = await seedUser();
        const group = await seedGroup(owner);
        await seedMember(group, user);
        const asMe = asUser((await sessionFor(user)).accessToken);
        const connection = await connect(asMe);
        const work = connection.sources.find((source) => source.name === 'Werk');
        if (work === undefined) throw new Error('no work calendar');

        // Before a sync: no calendar, nothing busy.
        const before = data<GroupAvailabilityResponse>(
            await asMe.get(
                `${API_ENDPOINTS.GROUPS.AVAILABILITY(group.id)}?from=2026-11-02&to=2026-11-08`,
            ),
        );
        expect(before.users.find((entry) => entry.user.id === user.id)?.hasCalendar).toBe(false);

        const synced = data<CalendarConnectionDto>(await asMe.post(API_ENDPOINTS.ME.CALENDAR_SYNC));
        expect(synced.lastSyncedAt).not.toBeNull();
        expect(synced.status).toBe(CalendarConnectionStatus.ACTIVE);
        expect(await CalendarEvent.countBy({ userId: user.id })).toBe(3);
        expect((await asMe.post(API_ENDPOINTS.ME.CALENDAR_SYNC)).status).toBe(429);

        const mine = data<MyAvailabilityResponse>(
            await asMe.get(`${API_ENDPOINTS.ME.AVAILABILITY}?from=2026-11-02&to=2026-11-08`),
        );
        const day = (date: string) => mine.days.find((entry) => entry.date === date)?.dayparts;
        expect(day('2026-11-03')?.[Daypart.MORNING]).toBe('calendar');
        // Marked "Free" in Google, and busy all the same: only ignore rules keep an event out.
        expect(day('2026-11-03')?.[Daypart.AFTERNOON]).toBe('calendar');
        expect(day('2026-11-04')?.[Daypart.EVENING]).toBe('calendar');
        // The owner sees what is behind a calendar cell; the group never does.
        expect(
            mine.days.find((entry) => entry.date === '2026-11-03')?.calendarTitles[Daypart.MORNING],
        ).toEqual(['Tandarts']);
        // The work calendar is off: its event is not even stored.
        expect(day('2026-11-05')?.[Daypart.MORNING]).toBeNull();

        const after = data<GroupAvailabilityResponse>(
            await asMe.get(
                `${API_ENDPOINTS.GROUPS.AVAILABILITY(group.id)}?from=2026-11-02&to=2026-11-08`,
            ),
        );
        expect(after.users.find((entry) => entry.user.id === user.id)?.hasCalendar).toBe(true);
        expect(
            after.days.find((entry) => entry.date === '2026-11-03')?.dayparts[Daypart.MORNING].busy,
        ).toEqual([user.id]);

        // Own events with titles, and an ignore rule on the series.
        const events = data<CalendarEventDto[]>(
            await asMe.get(`${API_ENDPOINTS.ME.CALENDAR_EVENTS}?from=2026-11-02&to=2026-11-08`),
        );
        expect(events.map((event) => event.title)).toEqual(['Tandarts', 'Event free', 'Voetbal']);
        const rule = await asMe.post(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES, {
            kind: CalendarIgnoreRuleKind.SERIES,
            value: 'series-x',
            label: 'Voetbal',
        });
        expect(rule.status).toBe(201);
        expect(
            (
                await asMe.post(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES, {
                    kind: 'series',
                    value: 'series-x',
                    label: 'x',
                })
            ).status,
        ).toBe(200);
        await asMe.post(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES, {
            kind: 'title',
            value: ' TANDARTS ',
            label: 'Tandarts',
        });
        const rules = data<CalendarIgnoreRuleDto[]>(
            await asMe.get(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES),
        );
        expect(rules.map((entry) => entry.value).sort()).toEqual(['series-x', 'tandarts']);
        const ignoredView = data<MyAvailabilityResponse>(
            await asMe.get(`${API_ENDPOINTS.ME.AVAILABILITY}?from=2026-11-02&to=2026-11-08`),
        );
        const ignoredDay = (date: string) =>
            ignoredView.days.find((entry) => entry.date === date)?.dayparts;
        expect(ignoredDay('2026-11-03')?.[Daypart.MORNING]).toBeNull();
        expect(ignoredDay('2026-11-04')?.[Daypart.EVENING]).toBeNull();
        const ruleId = data<CalendarIgnoreRuleDto>(rule).id;
        expect((await asMe.delete(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULE(ruleId))).status).toBe(204);
        expect((await asMe.delete(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULE(ruleId))).status).toBe(404);

        // Turning the work calendar on makes the nightly job pick it up; off again drops its events.
        const toggled = data<CalendarSourceDto>(
            await asMe.patch(API_ENDPOINTS.ME.CALENDAR_SOURCE(work.id), { enabled: true }),
        );
        expect(toggled.enabled).toBe(true);
        const job = data<WorkerJobResponse>(
            await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CALENDAR_SYNC),
        );
        expect(job.stats).toMatchObject({ connections: 1, synced: 1, failed: 0, events: 4 });
        await asMe.patch(API_ENDPOINTS.ME.CALENDAR_SOURCE(work.id), { enabled: false });
        expect(await CalendarEvent.countBy({ userId: user.id })).toBe(3);

        // A dead grant marks the connection; the nightly job then leaves it alone.
        fixture.failWith = 'reauth';
        const dead = data<WorkerJobResponse>(
            await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CALENDAR_SYNC),
        );
        expect(dead.stats).toMatchObject({ synced: 0, failed: 1 });
        expect(data<CalendarConnectionDto>(await asMe.get(API_ENDPOINTS.ME.CALENDAR)).status).toBe(
            CalendarConnectionStatus.REAUTH_REQUIRED,
        );
        fixture.failWith = null;
        expect(
            data<WorkerJobResponse>(
                await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CALENDAR_SYNC),
            ).stats,
        ).toMatchObject({ connections: 0 });

        expect((await asMe.delete(API_ENDPOINTS.ME.CALENDAR)).status).toBe(204);
        expect(fixture.revoked).toEqual(['fixture-refresh']);
        expect(await CalendarEvent.countBy({ userId: user.id })).toBe(0);
        expect(
            data<CalendarConnectionDto | null>(await asMe.get(API_ENDPOINTS.ME.CALENDAR)),
        ).toBeNull();
        expect((await asMe.delete(API_ENDPOINTS.ME.CALENDAR)).status).toBe(404);
    });
});
