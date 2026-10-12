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

/**
 * The two ends of a period: "1 jul" and "31 aug 2027". The year shows once,
 * on the last day, unless the period runs into another year.
 */
export function formatPeriod(
    start: string,
    end: string,
    lang: string | undefined,
): { start: string; end: string } {
    const first = DateTime.fromISO(start, { zone: TIME_ZONE }).setLocale(lang ?? 'nl');
    const last = DateTime.fromISO(end, { zone: TIME_ZONE }).setLocale(lang ?? 'nl');
    return {
        start: first.toFormat(first.year === last.year ? 'd LLL' : 'd LLL yyyy'),
        end: last.toFormat('d LLL yyyy'),
    };
}

/** A month for a picker: "oktober 2026" or "October 2026". */
export function formatMonth(year: number, month: number, lang: string | undefined): string {
    return DateTime.fromObject({ year, month }, { zone: TIME_ZONE })
        .setLocale(lang ?? 'nl')
        .toFormat('LLLL yyyy');
}

/** A moment for people: "3 okt 2026, 14:05" or "Oct 3, 2026, 2:05 PM". */
export function formatDateTime(iso: string, lang: string | undefined): string {
    return DateTime.fromISO(iso, { zone: TIME_ZONE })
        .setLocale(lang ?? 'nl')
        .toLocaleString(DateTime.DATETIME_MED);
}
