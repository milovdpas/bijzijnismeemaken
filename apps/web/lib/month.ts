import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { IsoDateString } from '@bzim/types';

/** A calendar month, the unit the availability editor pages through. */
export interface Month {
    year: number;
    /** 1 to 12. */
    month: number;
}

export function currentMonth(): Month {
    const now = DateTime.now().setZone(TIME_ZONE);
    return { year: now.year, month: now.month };
}

export function shiftMonth({ year, month }: Month, by: number): Month {
    const shifted = DateTime.fromObject({ year, month, day: 1 }, { zone: TIME_ZONE }).plus({
        months: by,
    });
    return { year: shifted.year, month: shifted.month };
}

/** First and last day, as the availability endpoints take them. */
export function monthRange({ year, month }: Month): { from: IsoDateString; to: IsoDateString } {
    const first = DateTime.fromObject({ year, month, day: 1 }, { zone: TIME_ZONE });
    return { from: first.toISODate() ?? '', to: first.endOf('month').toISODate() ?? '' };
}

/** "november 2026" in the given language. */
export function monthLabel({ year, month }: Month, locale: string): string {
    return DateTime.fromObject({ year, month, day: 1 }, { zone: TIME_ZONE })
        .setLocale(locale)
        .toFormat('LLLL yyyy');
}

/** The short weekday and day number for a grid row: "ma 2" / "Mon 2". */
export function dayLabel(date: IsoDateString, locale: string): string {
    return DateTime.fromISO(date, { zone: TIME_ZONE }).setLocale(locale).toFormat('ccc d');
}

export function isWeekend(date: IsoDateString): boolean {
    return DateTime.fromISO(date, { zone: TIME_ZONE }).weekday >= 6;
}
