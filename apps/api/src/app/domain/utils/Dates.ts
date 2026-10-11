import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { IsoDateString, Weekday } from '@bzim/types';

/**
 * Wall-clock helpers in the app's one time zone. Everything that asks "what
 * day is it" goes through here, so a server in UTC and a laptop in Amsterdam
 * agree on when a day starts.
 */

/** Today's calendar date in Europe/Amsterdam, `YYYY-MM-DD`. */
export function today(): IsoDateString {
    const date = DateTime.now().setZone(TIME_ZONE).toISODate();
    if (date === null) {
        throw new Error('The clock produced no date');
    }
    return date;
}

/** Every calendar date from `from` to `to`, both inclusive, as `YYYY-MM-DD`. */
export function eachDay(from: IsoDateString, to: IsoDateString): IsoDateString[] {
    const days: IsoDateString[] = [];
    let cursor = DateTime.fromISO(from, { zone: TIME_ZONE });
    const end = DateTime.fromISO(to, { zone: TIME_ZONE });
    while (cursor <= end) {
        const date = cursor.toISODate();
        if (date === null) break;
        days.push(date);
        cursor = cursor.plus({ days: 1 });
    }
    return days;
}

/** ISO weekday (Monday 1 to Sunday 7) of a calendar date, the numbering `Weekday` uses. */
export function weekdayOf(date: IsoDateString): Weekday {
    return DateTime.fromISO(date, { zone: TIME_ZONE }).weekday;
}
