import { DateTime } from 'luxon';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    API_ENDPOINTS,
    CALENDAR_FEED,
    CalendarConnectionStatus,
    Daypart,
    TIME_ZONE,
} from '@bzim/types';
import type {
    CalendarEventDto,
    CalendarFeedDto,
    GroupAvailabilityResponse,
    WorkerJobResponse,
} from '@bzim/types';

import CalendarEvent from '../src/app/domain/models/CalendarEvent.entity';
import CalendarFeed from '../src/app/domain/models/CalendarFeed.entity';
import { FeedError, FeedFetcher } from '../src/app/infrastructure/modules/calendar/FeedFetcher';
import { env } from '../src/config/app';
import { sessionFor } from './support/auth';
import { asUser, asWorker, data, error } from './support/client';
import { seedGroup, seedUser } from './support/factories';

afterEach(() => {
    vi.restoreAllMocks();
});

/** A Monday two weeks out, inside every sync window, as an ICS date and an ISO one. */
function nextMonday(): { ics: string; iso: string } {
    const monday = DateTime.now().setZone(TIME_ZONE).startOf('week').plus({ weeks: 2 });
    return { ics: monday.toFormat('yyyyLLdd'), iso: monday.toISODate() ?? '' };
}

/** A feed with one event that day, at home time; Apple names its calendar. */
function icloudFeed(day: string, title: string, from = '090000', until = '110000'): string {
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'X-WR-CALNAME:Thuis',
        'BEGIN:VEVENT',
        `UID:${title}`,
        `SUMMARY:${title}`,
        `DTSTART:${day}T${from}`,
        `DTEND:${day}T${until}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

const ICLOUD = 'webcal://p52-caldav.icloud.com/published/2/MTIzNDU2Nzg5';

async function setup() {
    const user = await seedUser();
    const group = await seedGroup(user);
    const asMe = asUser((await sessionFor(user)).accessToken);
    return { user, group, asMe };
}

describe('calendar links', () => {
    it('adds a link, reads it at once, and counts it in the availability', async () => {
        const { user, group, asMe } = await setup();
        const monday = nextMonday();
        const fetch = vi
            .spyOn(FeedFetcher, 'fetch')
            .mockResolvedValue(icloudFeed(monday.ics, 'Tandarts'));

        const added = await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS, { url: ICLOUD });
        expect(added.status).toBe(201);
        const feed = data<CalendarFeedDto>(added);
        expect(feed).toMatchObject({
            name: 'Thuis',
            host: 'p52-caldav.icloud.com',
            status: CalendarConnectionStatus.ACTIVE,
            lastError: null,
        });
        expect(feed.lastSyncedAt).not.toBeNull();
        // The link is the key to the calendar: read over https, never sent back.
        expect(fetch).toHaveBeenCalledWith(
            'https://p52-caldav.icloud.com/published/2/MTIzNDU2Nzg5',
        );
        expect(JSON.stringify(feed)).not.toContain('MTIzNDU2Nzg5');
        expect((await CalendarFeed.findOneByOrFail({ id: feed.id })).url).toBe(
            'https://p52-caldav.icloud.com/published/2/MTIzNDU2Nzg5',
        );

        expect(data<CalendarFeedDto[]>(await asMe.get(API_ENDPOINTS.ME.CALENDAR_FEEDS))).toEqual([
            feed,
        ]);
        const events = data<CalendarEventDto[]>(
            await asMe.get(
                `${API_ENDPOINTS.ME.CALENDAR_EVENTS}?from=${monday.iso}&to=${monday.iso}`,
            ),
        );
        expect(events).toMatchObject([{ title: 'Tandarts', feedId: feed.id, sourceId: null }]);

        // Busy that morning for the group, and counted as somebody with a calendar.
        const availability = data<GroupAvailabilityResponse>(
            await asMe.get(
                `${API_ENDPOINTS.GROUPS.AVAILABILITY(group.id)}?from=${monday.iso}&to=${monday.iso}`,
            ),
        );
        expect(availability.users.find((entry) => entry.user.id === user.id)?.hasCalendar).toBe(
            true,
        );
        const day = availability.days.find((entry) => entry.date === monday.iso);
        expect(day?.dayparts[Daypart.MORNING].busy).toEqual([user.id]);
        expect(day?.dayparts[Daypart.AFTERNOON].busy).toEqual([]);

        // The same link again, written either way, is the same calendar.
        const again = await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS, {
            url: 'https://p52-caldav.icloud.com/published/2/MTIzNDU2Nzg5',
        });
        expect(again.status).toBe(409);
        expect(error(again).details).toEqual({ problem: 'ALREADY_ADDED' });
    });

    it('refuses a link it cannot read, keeps none of them, and has room for ten', async () => {
        const { user, asMe } = await setup();
        const fetch = vi.spyOn(FeedFetcher, 'fetch');
        const add = (url: string) => asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS, { url });

        const plain = await add('http://example.com/calendar.ics');
        expect(error(plain).details).toEqual({ problem: 'INVALID_URL' });
        expect(fetch).not.toHaveBeenCalled();

        fetch.mockRejectedValueOnce(new FeedError('GONE', 'The feed answered 404'));
        expect(error(await add('https://example.com/gone.ics')).details).toEqual({
            problem: 'GONE',
        });
        fetch.mockResolvedValueOnce('<html>Sign in</html>');
        const page = await add('https://example.com/page.ics');
        expect(page.status).toBe(422);
        expect(error(page).details).toEqual({ problem: 'NOT_A_CALENDAR' });
        fetch.mockRejectedValueOnce(new FeedError('UNREACHABLE', 'timeout'));
        expect(error(await add('https://example.com/slow.ics')).details).toEqual({
            problem: 'UNREACHABLE',
        });
        expect(await CalendarFeed.countBy({ userId: user.id })).toBe(0);

        for (let index = 0; index < CALENDAR_FEED.MAX_PER_USER; index += 1) {
            await CalendarFeed.create({
                userId: user.id,
                name: `Link ${String(index)}`,
                url: `https://example.com/${String(index)}.ics`,
                urlHash: `hash-${String(index)}`,
                host: 'example.com',
                status: CalendarConnectionStatus.ACTIVE,
                lastSyncedAt: null,
                lastError: null,
            }).save();
        }
        const full = await add('https://example.com/one-more.ics');
        expect(full.status).toBe(409);
        expect(error(full).details).toEqual({ problem: 'TOO_MANY' });
    });

    it('reads every link again, marks one that was switched off, and the night leaves it be', async () => {
        const { user, asMe } = await setup();
        const other = asUser((await sessionFor(await seedUser())).accessToken);
        const monday = nextMonday();
        const fetch = vi
            .spyOn(FeedFetcher, 'fetch')
            .mockResolvedValue(icloudFeed(monday.ics, 'Tandarts'));
        const feed = data<CalendarFeedDto>(
            await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS, { url: ICLOUD, name: ' Gezin ' }),
        );
        expect(feed.name).toBe('Gezin');

        // Read again: the events become what the link says now.
        fetch.mockResolvedValue(icloudFeed(monday.ics, 'Fysio', '140000', '150000'));
        const synced = data<CalendarFeedDto[]>(
            await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS_SYNC),
        );
        expect(synced[0]?.status).toBe(CalendarConnectionStatus.ACTIVE);
        expect(
            (await CalendarEvent.findBy({ userId: user.id })).map((event) => event.title),
        ).toEqual(['Fysio']);

        // Switched off at Apple: it needs a new link, so the night does not try it again.
        fetch.mockRejectedValue(new FeedError('GONE', 'The feed answered 404'));
        const gone = data<CalendarFeedDto[]>(await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS_SYNC));
        expect(gone[0]).toMatchObject({
            status: CalendarConnectionStatus.REAUTH_REQUIRED,
            lastError: 'GONE',
        });
        const calls = fetch.mock.calls.length;
        const night = data<WorkerJobResponse>(
            await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CALENDAR_SYNC),
        );
        expect(night.stats).toMatchObject({ feeds: 0, feedsSynced: 0, feedsFailed: 0 });
        expect(fetch.mock.calls.length).toBe(calls);

        // Somebody else cannot touch it; its owner removes it, events and all.
        const url = API_ENDPOINTS.ME.CALENDAR_FEED(feed.id);
        expect((await other.delete(url)).status).toBe(404);
        expect((await asMe.delete(url)).status).toBe(204);
        expect(await CalendarEvent.countBy({ userId: user.id })).toBe(0);
        expect(data<CalendarFeedDto[]>(await asMe.get(API_ENDPOINTS.ME.CALENDAR_FEEDS))).toEqual(
            [],
        );
    });

    it('is read every night with the Google calendars', async () => {
        const { user, asMe } = await setup();
        const monday = nextMonday();
        vi.spyOn(FeedFetcher, 'fetch').mockResolvedValue(icloudFeed(monday.ics, 'Tandarts'));
        await asMe.post(API_ENDPOINTS.ME.CALENDAR_FEEDS, { url: ICLOUD });
        await CalendarEvent.delete({ userId: user.id });

        const night = data<WorkerJobResponse>(
            await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CALENDAR_SYNC),
        );
        expect(night.stats).toMatchObject({ feeds: 1, feedsSynced: 1, feedsFailed: 0 });
        expect(await CalendarEvent.countBy({ userId: user.id })).toBe(1);
    });
});
