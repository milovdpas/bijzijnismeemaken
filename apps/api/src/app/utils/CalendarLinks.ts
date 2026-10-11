import { DateTime } from 'luxon';
import { TIME_ZONE, occurrenceWindow } from '@bzim/types';
import type { Daypart } from '@bzim/types';

/**
 * An occurrence as a calendar sees it: an instant range, or one whole day.
 * Everything that hands a date to a calendar (ICS, the Google link, the
 * auto-add in M2) starts from this, so they all agree on when it is.
 */
export interface CalendarSpan {
    /** `YYYY-MM-DD` in Europe/Amsterdam. */
    date: string;
    start: DateTime | null;
    end: DateTime | null;
}

export function calendarSpan(
    date: string,
    daypart: Daypart | null,
    startTime: string | null,
    durationMinutes: number | null,
): CalendarSpan {
    const window = occurrenceWindow(daypart, startTime, durationMinutes);
    if (window === null) {
        return { date, start: null, end: null };
    }
    const midnight = DateTime.fromISO(date, { zone: TIME_ZONE }).startOf('day');
    return {
        date,
        start: atMinute(midnight, window.startMinute),
        end: atMinute(midnight, window.endMinute),
    };
}

/**
 * Minutes after midnight as wall-clock time. `set`, never `plus`: on the day
 * the clocks change, midnight plus twenty hours is 19:00 or 21:00, and a
 * plan for eight in the evening means eight in the evening. Minute 1440 and
 * beyond roll into the next day.
 */
export function atMinute(midnight: DateTime, minute: number): DateTime {
    return midnight
        .plus({ days: Math.floor(minute / 1440) })
        .set({ hour: Math.floor((minute % 1440) / 60), minute: minute % 60 });
}

export interface CalendarEvent {
    uid: string;
    title: string;
    description: string | null;
    location: string | null;
    url: string;
    span: CalendarSpan;
}

/** `20261101T170000Z`: the UTC instant in the shape both ICS and Google want. */
function stamp(instant: DateTime): string {
    return instant.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function dayStamp(date: string, plusDays = 0): string {
    return DateTime.fromISO(date, { zone: TIME_ZONE })
        .plus({ days: plusDays })
        .toFormat('yyyyLLdd');
}

/** RFC 5545 text: backslashes, commas, semicolons and newlines escaped, folded at 75 octets. */
function icsText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
    const bytes = Buffer.from(line, 'utf8');
    if (bytes.length <= 75) return line;
    const parts: string[] = [];
    let rest = line;
    while (Buffer.byteLength(rest, 'utf8') > 75) {
        let cut = 75;
        while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 75) cut -= 1;
        // Never between the two halves of an emoji: that is not UTF-8 any more.
        if (/[\uD800-\uDBFF]/.test(rest.charAt(cut - 1))) cut -= 1;
        parts.push(rest.slice(0, cut));
        rest = ` ${rest.slice(cut)}`;
    }
    parts.push(rest);
    return parts.join('\r\n');
}

/** A one-event calendar file, all-day when the occurrence has no time. */
export function icsFor(event: CalendarEvent, now: DateTime): string {
    const when =
        event.span.start === null || event.span.end === null
            ? [
                  `DTSTART;VALUE=DATE:${dayStamp(event.span.date)}`,
                  `DTEND;VALUE=DATE:${dayStamp(event.span.date, 1)}`,
              ]
            : [`DTSTART:${stamp(event.span.start)}`, `DTEND:${stamp(event.span.end)}`];
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//bijzijn//Bij zijn is meemaken//NL',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTAMP:${stamp(now)}`,
        ...when,
        `SUMMARY:${icsText(event.title)}`,
        ...(event.description === null ? [] : [`DESCRIPTION:${icsText(event.description)}`]),
        ...(event.location === null ? [] : [`LOCATION:${icsText(event.location)}`]),
        `URL:${event.url}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];
    return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** The "add to Google Calendar" template link; the API never talks to Google for this. */
export function googleCalendarUrl(event: CalendarEvent): string {
    const dates =
        event.span.start === null || event.span.end === null
            ? `${dayStamp(event.span.date)}/${dayStamp(event.span.date, 1)}`
            : `${stamp(event.span.start)}/${stamp(event.span.end)}`;
    const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates });
    const details = [event.description, event.url].filter((part) => part !== null).join('\n\n');
    if (details !== '') params.set('details', details);
    if (event.location !== null) params.set('location', event.location);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
