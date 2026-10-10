import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { Daypart, IsoDateString, LocalTimeString } from '@bzim/types';

/**
 * "vrijdag 6 november" plus the time or the daypart label the caller
 * supplies. Shared by the card, the detail page and the planning dialog so
 * an occurrence reads the same everywhere.
 */
export function describeOccurrence(
    date: IsoDateString,
    daypart: Daypart | null,
    startTime: LocalTimeString | null,
    locale: string,
    daypartLabel: (daypart: Daypart) => string,
    format = 'cccc d LLLL',
): string {
    const day = DateTime.fromISO(date, { zone: TIME_ZONE }).setLocale(locale).toFormat(format);
    if (startTime !== null) return `${day} · ${startTime}`;
    if (daypart !== null) return `${day} · ${daypartLabel(daypart)}`;
    return day;
}

/** A planned occurrence whose day has passed waits for someone to say what happened. */
export function awaitsConfirmation(date: IsoDateString, today: IsoDateString): boolean {
    return date < today;
}

/** Today's calendar date in the app's zone. */
export function todayIso(): IsoDateString {
    return DateTime.now().setZone(TIME_ZONE).toISODate() ?? '';
}
