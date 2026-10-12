import ICAL from 'ical.js';
import { DateTime, IANAZone } from 'luxon';
import { CalendarEventType, TIME_ZONE } from '@bzim/types';

import type { ProviderEvent } from './CalendarProvider';

/** Instances of one repeating event looked at before giving up; a daily one since 1980 is about 17,000. */
const MAX_INSTANCES = 20_000;
/** The provider event id column. */
const ID_MAX_LENGTH = 255;

/** One instance of a series as ical.js describes it; its own declared type does not resolve. */
interface OccurrenceDetails {
    recurrenceId: ICAL.Time;
    /** The series, or the moved or changed instance that replaces this one. */
    item: ICAL.Event;
    startDate: ICAL.Time;
    endDate: ICAL.Time;
}

export interface ParsedFeed {
    /** What the calendar calls itself (`X-WR-CALNAME`), or null. */
    name: string | null;
    events: ProviderEvent[];
}

/**
 * Reads an iCalendar feed (RFC 5545) into the events that overlap a window,
 * the way the Google provider hands them over: repeats expanded with their
 * moved and skipped instances, cancelled ones left out, every instant in
 * UTC, all-day events as Amsterdam midnight to midnight. The feed's own
 * time zones are used, Outlook's Windows names included. A time without a
 * zone is Amsterdam time, and so is one in a zone the feed names without
 * defining it, unless that is a real IANA zone. Throws when the text is not
 * a calendar.
 */
export function parseIcsFeed(text: string, from: Date, to: Date): ParsedFeed {
    const parsed: unknown = ICAL.parse(text);
    // One calendar parses to ['vcalendar', …]; several to a list of those.
    const first = Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed[0] : parsed;
    const root = new ICAL.Component(first as ConstructorParameters<typeof ICAL.Component>[0]);
    if (root.name !== 'vcalendar') {
        throw new Error('Not an iCalendar feed');
    }

    // The zones live in a registry shared by the whole process. Only this
    // feed's own are added, and taken out again before returning, so one
    // feed's definitions never shape another's times.
    const added: string[] = [];
    for (const definition of root.getAllSubcomponents('vtimezone')) {
        const tzid = definition.getFirstPropertyValue('tzid');
        if (typeof tzid === 'string' && !ICAL.TimezoneService.has(tzid)) {
            ICAL.TimezoneService.register(definition);
            added.push(tzid);
        }
    }
    try {
        const name = root.getFirstPropertyValue('x-wr-calname');
        return {
            name: typeof name === 'string' && name.trim() !== '' ? name.trim() : null,
            events: expand(root, from, to),
        };
    } finally {
        for (const tzid of added) ICAL.TimezoneService.remove(tzid);
    }
}

function expand(root: ICAL.Component, from: Date, to: Date): ProviderEvent[] {
    const all = root.getAllSubcomponents('vevent').map((vevent) => new ICAL.Event(vevent));
    const masters = new Map<string, ICAL.Event>();
    for (const event of all) {
        if (!event.isRecurrenceException() && event.uid) masters.set(event.uid, event);
    }
    // A moved or changed instance belongs to its series; one without a
    // series in the feed stands on its own.
    const loose: ICAL.Event[] = [];
    for (const event of all) {
        if (!event.isRecurrenceException()) continue;
        const master = masters.get(event.uid);
        if (master === undefined) loose.push(event);
        else master.relateException(event);
    }

    const events = new Map<string, ProviderEvent>();
    const keep = (event: ProviderEvent | null) => {
        if (event !== null && event.endAt > from && event.startAt < to && !events.has(event.id)) {
            events.set(event.id, event);
        }
    };
    for (const event of all) {
        if (event.isRecurrenceException()) continue;
        if (!event.isRecurring()) {
            keep(toEvent(event, event.startDate, event.endDate, event.uid, null));
            continue;
        }
        const iterator = event.iterator();
        for (let count = 0; count < MAX_INSTANCES; count += 1) {
            const next = iterator.next();
            if (!next || instant(next) >= to) break;
            const details: OccurrenceDetails = event.getOccurrenceDetails(next);
            keep(
                toEvent(
                    details.item,
                    details.startDate,
                    details.endDate,
                    `${event.uid}/${details.recurrenceId.toString()}`,
                    event.uid,
                ),
            );
        }
    }
    for (const event of loose) {
        keep(
            toEvent(
                event,
                event.startDate,
                event.endDate,
                `${event.uid}/${event.recurrenceId.toString()}`,
                event.uid,
            ),
        );
    }
    return [...events.values()];
}

/** One instance as the sync stores it; null for a cancelled one. */
function toEvent(
    item: ICAL.Event,
    start: ICAL.Time,
    end: ICAL.Time,
    id: string,
    series: string | null,
): ProviderEvent | null {
    const status = item.component.getFirstPropertyValue('status');
    if (typeof status === 'string' && status.toUpperCase() === 'CANCELLED') return null;
    const transp = item.component.getFirstPropertyValue('transp');
    const shared = {
        id: id.slice(0, ID_MAX_LENGTH),
        recurringEventId: series?.slice(0, ID_MAX_LENGTH) ?? null,
        title: item.summary ?? '',
        transparent: typeof transp === 'string' && transp.toUpperCase() === 'TRANSPARENT',
        eventType: CalendarEventType.DEFAULT,
    };
    if (start.isDate) {
        const startDay = DateTime.fromISO(start.toString(), { zone: TIME_ZONE });
        // The end is exclusive; an end on or before the start is a one-day event.
        const endDay = end.isDate ? DateTime.fromISO(end.toString(), { zone: TIME_ZONE }) : null;
        const until = endDay !== null && endDay > startDay ? endDay : startDay.plus({ days: 1 });
        return {
            ...shared,
            allDay: true,
            startDate: startDay.toISODate(),
            endDate: until.toISODate(),
            startAt: startDay.toUTC().toJSDate(),
            endAt: until.toUTC().toJSDate(),
        };
    }
    const startAt = instant(start);
    // An end worked out from a DURATION loses the zone name of its start.
    const endAt = instant(end, start);
    return {
        ...shared,
        allDay: false,
        startDate: null,
        endDate: null,
        startAt,
        endAt: endAt > startAt ? endAt : startAt,
    };
}

/**
 * The instant a time stands for. A time in a defined zone or in UTC knows
 * its own offset. A floating one, or one in a zone the feed did not define,
 * would otherwise be read in the server's zone (UTC in production), so it
 * is placed in that named zone when it is a real one (or, without a name,
 * in the one `sibling` names), else in Amsterdam.
 */
function instant(time: ICAL.Time, sibling?: ICAL.Time): Date {
    if (time.zone !== ICAL.Timezone.localTimezone) {
        return time.toJSDate();
    }
    const named = zoneName(time) ?? (sibling === undefined ? null : zoneName(sibling));
    const zone = named !== null && IANAZone.isValidZone(named) ? named : TIME_ZONE;
    return DateTime.fromObject(
        {
            year: time.year,
            month: time.month,
            day: time.day,
            hour: time.hour,
            minute: time.minute,
            second: time.second,
        },
        { zone },
    )
        .toUTC()
        .toJSDate();
}

/** The TZID a time was written with when the feed did not define it; ical.js keeps it aside. */
function zoneName(time: ICAL.Time): string | null {
    const named: unknown = (time as { timezone?: unknown }).timezone;
    return typeof named === 'string' && named !== '' ? named : null;
}
