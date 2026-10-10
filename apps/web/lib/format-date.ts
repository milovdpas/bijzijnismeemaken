import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';

/**
 * A calendar date for people, in the app's language and time zone:
 * "3 okt 2026" or "Oct 3, 2026". Everything in the app happens in
 * Europe/Amsterdam, so a member abroad sees the same day as everyone else.
 */
export function formatDate(iso: string, lang: string | undefined): string {
    return DateTime.fromISO(iso, { zone: TIME_ZONE })
        .setLocale(lang ?? 'nl')
        .toLocaleString(DateTime.DATE_MED);
}

/** A month for a picker: "oktober 2026" or "October 2026". */
export function formatMonth(year: number, month: number, lang: string | undefined): string {
    return DateTime.fromObject({ year, month }, { zone: TIME_ZONE })
        .setLocale(lang ?? 'nl')
        .toFormat('LLLL yyyy');
}
