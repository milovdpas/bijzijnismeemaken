import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { Daypart } from '@bzim/types';

import { calendarSpan, googleCalendarUrl, icsFor } from '../src/app/domain/utils/CalendarLinks';

const now = DateTime.fromISO('2026-10-10T10:00:00Z');

describe('calendarSpan', () => {
    it('converts Amsterdam wall-clock to instants, across DST', () => {
        // 1 November: CET, UTC+1.
        const winter = calendarSpan('2026-11-01', null, '19:30', 90);
        expect(winter.start?.toUTC().toISO()).toBe('2026-11-01T18:30:00.000Z');
        expect(winter.end?.toUTC().toISO()).toBe('2026-11-01T20:00:00.000Z');
        // 15 June: CEST, UTC+2.
        const summer = calendarSpan('2026-06-15', Daypart.MORNING, null, null);
        expect(summer.start?.toUTC().toISO()).toBe('2026-06-15T06:00:00.000Z');
        expect(summer.end?.toUTC().toISO()).toBe('2026-06-15T10:00:00.000Z');
        expect(calendarSpan('2026-06-15', null, null, null).start).toBeNull();
    });

    it('keeps wall-clock time on the days the clocks change', () => {
        // 25 October 2026: the clocks go back at 03:00. Eight in the evening is CET.
        const autumn = calendarSpan('2026-10-25', null, '20:00', 60);
        expect(autumn.start?.toUTC().toISO()).toBe('2026-10-25T19:00:00.000Z');
        expect(autumn.end?.toUTC().toISO()).toBe('2026-10-25T20:00:00.000Z');
        // 29 March 2026: forward at 02:00. The evening daypart is CEST, and ends at midnight.
        const spring = calendarSpan('2026-03-29', Daypart.EVENING, null, null);
        expect(spring.start?.toUTC().toISO()).toBe('2026-03-29T16:00:00.000Z');
        expect(spring.end?.toUTC().toISO()).toBe('2026-03-29T22:00:00.000Z');
        // A late start runs into the next day.
        const late = calendarSpan('2026-10-25', null, '23:30', 90);
        expect(late.end?.toUTC().toISO()).toBe('2026-10-26T00:00:00.000Z');
    });
});

describe('icsFor', () => {
    it('writes a timed event in UTC with escaped text', () => {
        const ics = icsFor(
            {
                uid: 'abc@bijzijn',
                title: 'Kaartavond; ronde 2, bij Milo',
                description: 'Neem\nkaarten mee',
                location: 'Milo, Utrecht',
                url: 'https://example.test/a',
                span: calendarSpan('2026-11-01', null, '19:30', 120),
            },
            now,
        );
        expect(ics).toContain('DTSTART:20261101T183000Z');
        expect(ics).toContain('DTEND:20261101T203000Z');
        expect(ics).toContain('SUMMARY:Kaartavond\\; ronde 2\\, bij Milo');
        expect(ics).toContain('DESCRIPTION:Neem\\nkaarten mee');
        expect(ics).toContain('LOCATION:Milo\\, Utrecht');
        expect(ics).toContain('DTSTAMP:20261010T100000Z');
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    });

    it('writes an all-day event as a date range ending the next day, and folds long lines', () => {
        const ics = icsFor(
            {
                uid: 'abc@bijzijn',
                title: 'x'.repeat(100),
                description: null,
                location: null,
                url: 'https://example.test/a',
                span: calendarSpan('2026-12-31', null, null, null),
            },
            now,
        );
        expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
        expect(ics).toContain('DTEND;VALUE=DATE:20270101');
        expect(ics).not.toContain('DESCRIPTION');
        const summary = ics.split('\r\n').find((line) => line.startsWith('SUMMARY'));
        expect(summary?.length).toBeLessThanOrEqual(75);
        expect(ics).toContain('\r\n x');
    });

    it('never folds in the middle of an emoji', () => {
        const ics = icsFor(
            {
                uid: 'abc@bijzijn',
                title: `${'a'.repeat(60)}🎉🎉🎉🎉 feest`,
                description: null,
                location: null,
                url: 'https://example.test/a',
                span: calendarSpan('2026-12-31', null, null, null),
            },
            now,
        );
        expect(Buffer.from(ics, 'utf8').toString('utf8')).toBe(ics);
        for (const line of ics.split('\r\n')) {
            expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
        }
        expect(ics.replace(/\r\n /g, '')).toContain('🎉🎉🎉🎉 feest');
    });
});

describe('googleCalendarUrl', () => {
    it('builds a template link with the same instants', () => {
        const url = googleCalendarUrl({
            uid: 'u',
            title: 'Kaartavond',
            description: null,
            location: 'Bij Milo',
            url: 'https://example.test/a',
            span: calendarSpan('2026-11-01', Daypart.EVENING, null, null),
        });
        const params = new URL(url).searchParams;
        expect(params.get('action')).toBe('TEMPLATE');
        expect(params.get('text')).toBe('Kaartavond');
        expect(params.get('dates')).toBe('20261101T170000Z/20261101T230000Z');
        expect(params.get('location')).toBe('Bij Milo');
        expect(params.get('details')).toBe('https://example.test/a');
    });
});
