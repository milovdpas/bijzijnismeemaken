import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';

import {
    FeedError,
    FeedFetcher,
    isPublicAddress,
    normalizeFeedUrl,
} from '../src/app/infrastructure/modules/calendar/FeedFetcher';
import { parseIcsFeed } from '../src/app/infrastructure/modules/calendar/IcsFeed';

/** Lines of a feed, as Apple and Microsoft send them: CRLF between. */
function feed(...lines: string[]): string {
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');
}

/** Outlook writes Windows zone names and defines them in the feed. */
const WINDOWS_ZONE = [
    'BEGIN:VTIMEZONE',
    'TZID:W. Europe Standard Time',
    'BEGIN:STANDARD',
    'DTSTART:16010101T030000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:16010101T020000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
];

const FROM = new Date('2026-10-01T00:00:00Z');
const TO = new Date('2027-01-01T00:00:00Z');

describe('parseIcsFeed', () => {
    it('expands a weekly series with a skipped and a moved instance, across the clock change', () => {
        const parsed = parseIcsFeed(
            feed(
                'X-WR-CALNAME:Werk',
                ...WINDOWS_ZONE,
                'BEGIN:VEVENT',
                'UID:work',
                'SUMMARY:Werk',
                'DTSTART;TZID=W. Europe Standard Time:20261012T090000',
                'DTEND;TZID=W. Europe Standard Time:20261012T170000',
                'RRULE:FREQ=WEEKLY;COUNT=4',
                'EXDATE;TZID=W. Europe Standard Time:20261019T090000',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:work',
                'RECURRENCE-ID;TZID=W. Europe Standard Time:20261026T090000',
                'SUMMARY:Werk later',
                'DTSTART;TZID=W. Europe Standard Time:20261026T120000',
                'DTEND;TZID=W. Europe Standard Time:20261026T200000',
                'END:VEVENT',
            ),
            FROM,
            TO,
        );
        expect(parsed.name).toBe('Werk');
        expect(
            parsed.events.map((event) => [
                event.title,
                event.startAt.toISOString(),
                event.recurringEventId,
            ]),
        ).toEqual([
            // Summer time: 09:00 is 07:00 UTC.
            ['Werk', '2026-10-12T07:00:00.000Z', 'work'],
            // The 19th is skipped; the 26th moved to noon, in winter time.
            ['Werk later', '2026-10-26T11:00:00.000Z', 'work'],
            ['Werk', '2026-11-02T08:00:00.000Z', 'work'],
        ]);
        expect(new Set(parsed.events.map((event) => event.id)).size).toBe(3);
    });

    it('reads all-day events, times without a zone, and an undefined real zone', () => {
        const parsed = parseIcsFeed(
            feed(
                'BEGIN:VEVENT',
                'UID:holiday',
                'SUMMARY:Vakantie',
                'DTSTART;VALUE=DATE:20261102',
                'DTEND;VALUE=DATE:20261107',
                'TRANSP:TRANSPARENT',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:one-day',
                'SUMMARY:Verjaardag',
                'DTSTART;VALUE=DATE:20261120',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:floating',
                'SUMMARY:Etentje',
                'DTSTART:20261015T190000',
                'DTEND:20261015T210000',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:london',
                'SUMMARY:Call',
                'DTSTART;TZID=Europe/London:20261016T190000',
                'DURATION:PT1H',
                'END:VEVENT',
            ),
            FROM,
            TO,
        );
        const byId = new Map(parsed.events.map((event) => [event.id, event]));
        expect(byId.get('holiday')).toMatchObject({
            allDay: true,
            startDate: '2026-11-02',
            endDate: '2026-11-07',
            transparent: true,
            recurringEventId: null,
        });
        // Amsterdam midnight to midnight, in UTC.
        expect(byId.get('holiday')?.startAt.toISOString()).toBe('2026-11-01T23:00:00.000Z');
        expect(byId.get('one-day')).toMatchObject({
            startDate: '2026-11-20',
            endDate: '2026-11-21',
        });
        // No zone: Amsterdam, whatever zone the server runs in.
        expect(byId.get('floating')?.startAt.toISOString()).toBe('2026-10-15T17:00:00.000Z');
        // A real zone the feed did not define is still that zone.
        expect(byId.get('london')?.startAt.toISOString()).toBe('2026-10-16T18:00:00.000Z');
        expect(byId.get('london')?.endAt.toISOString()).toBe('2026-10-16T19:00:00.000Z');
    });

    it('leaves out cancelled events and anything outside the window', () => {
        const parsed = parseIcsFeed(
            feed(
                'BEGIN:VEVENT',
                'UID:cancelled',
                'SUMMARY:Gaat niet door',
                'STATUS:CANCELLED',
                'DTSTART:20261015T190000Z',
                'DTEND:20261015T200000Z',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:past',
                'SUMMARY:Vorig jaar',
                'DTSTART:20250101T100000Z',
                'DTEND:20250101T110000Z',
                'END:VEVENT',
                'BEGIN:VEVENT',
                'UID:daily',
                'SUMMARY:Elke dag sinds 2020',
                'DTSTART:20200101T060000Z',
                'DTEND:20200101T063000Z',
                'RRULE:FREQ=DAILY',
                'END:VEVENT',
            ),
            new Date('2026-10-01T00:00:00Z'),
            new Date('2026-10-04T00:00:00Z'),
        );
        expect(parsed.events.map((event) => event.id)).toEqual([
            'daily/2026-10-01T06:00:00Z',
            'daily/2026-10-02T06:00:00Z',
            'daily/2026-10-03T06:00:00Z',
        ]);
    });

    it('refuses what is not a calendar, and leaves no zone of a feed behind', () => {
        expect(() => parseIcsFeed('<html>Not here</html>', FROM, TO)).toThrow();
        parseIcsFeed(feed(...WINDOWS_ZONE), FROM, TO);
        expect(ICAL.TimezoneService.has('W. Europe Standard Time')).toBe(false);
    });
});

describe('calendar links', () => {
    it('reads webcal as https and refuses anything else', () => {
        expect(normalizeFeedUrl(' webcal://p52-caldav.icloud.com/published/2/abc ')).toBe(
            'https://p52-caldav.icloud.com/published/2/abc',
        );
        expect(normalizeFeedUrl('https://outlook.live.com/owa/calendar/x/calendar.ics#top')).toBe(
            'https://outlook.live.com/owa/calendar/x/calendar.ics',
        );
        expect(normalizeFeedUrl('http://example.com/calendar.ics')).toBeNull();
        expect(normalizeFeedUrl('https://user:secret@example.com/calendar.ics')).toBeNull();
        expect(normalizeFeedUrl('https://example.com:8443/calendar.ics')).toBeNull();
        expect(normalizeFeedUrl('https://10.0.0.5/calendar.ics')).toBeNull();
        expect(normalizeFeedUrl('https://[::1]/calendar.ics')).toBeNull();
        expect(normalizeFeedUrl('https://1.1.1.1/calendar.ics')).toBe(
            'https://1.1.1.1/calendar.ics',
        );
        expect(normalizeFeedUrl('not a link')).toBeNull();
        expect(normalizeFeedUrl(`https://example.com/${'a'.repeat(2000)}`)).toBeNull();
    });

    it('tells public addresses from this machine and private networks', () => {
        for (const address of [
            '127.0.0.1',
            '10.1.2.3',
            '172.20.0.1',
            '192.168.1.10',
            '169.254.169.254',
            '100.64.0.1',
            '0.0.0.0',
            '::1',
            '::',
            'fd00::1',
            'fe80::1',
            '::ffff:127.0.0.1',
            'not an address',
        ]) {
            expect(isPublicAddress(address), address).toBe(false);
        }
        for (const address of ['8.8.8.8', '17.253.144.10', '2606:4700::1111']) {
            expect(isPublicAddress(address), address).toBe(true);
        }
    });

    it('will not fetch a name that leads to this machine', async () => {
        await expect(FeedFetcher.fetch('https://localhost/calendar.ics')).rejects.toBeInstanceOf(
            FeedError,
        );
        await expect(FeedFetcher.fetch('https://localhost/calendar.ics')).rejects.toMatchObject({
            problem: 'UNREACHABLE',
        });
    });
});
