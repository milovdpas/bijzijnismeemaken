import { DateTime, Info } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { IsoDateString } from '@bzim/types';

import type { Month } from './month';

/**
 * A date as everybody here writes it, whatever the device: dd/mm/yyyy. The
 * browser's own date field follows the device's language instead, so an
 * English phone showed mm/dd/yyyy.
 */
export function formatDateInput(date: IsoDateString | ''): string {
    if (date === '') return '';
    const parsed = DateTime.fromISO(date, { zone: TIME_ZONE });
    return parsed.isValid ? parsed.toFormat('dd/MM/yyyy') : '';
}

/**
 * What was typed, tidied while typing: digits only, a slash between the
 * day, the month and the year, and a lone digit before a typed separator
 * padded ("1/" is "01"). No slash is added at the end, so deleting one is
 * never undone.
 */
export function maskDateInput(raw: string): string {
    const fields: string[] = [];
    let current = '';
    for (const char of raw) {
        if (char >= '0' && char <= '9') {
            if (fields.length < 2) {
                current += char;
                if (current.length === 2) {
                    fields.push(current);
                    current = '';
                }
            } else if (current.length < 4) {
                current += char;
            }
        } else if (current !== '' && fields.length < 2) {
            fields.push(current.padStart(2, '0'));
            current = '';
        }
    }
    return [...fields, ...(current === '' ? [] : [current])].join('/');
}

/** The typed text as a date: the ISO day, null when empty, undefined while it is not a whole valid date. */
export function parseDateInput(text: string): IsoDateString | null | undefined {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (match === null) return undefined;
    const [, day, month, year] = match;
    const date = DateTime.fromObject(
        { year: Number(year), month: Number(month), day: Number(day) },
        { zone: TIME_ZONE },
    );
    return date.isValid ? (date.toISODate() ?? undefined) : undefined;
}

export interface CalendarDay {
    date: IsoDateString;
    day: number;
    inMonth: boolean;
}

/** The weeks of a month for a calendar, Monday first, padded with the days around it. */
export function calendarWeeks({ year, month }: Month): CalendarDay[][] {
    const first = DateTime.fromObject({ year, month, day: 1 }, { zone: TIME_ZONE });
    const start = first.minus({ days: first.weekday - 1 });
    const end = first.endOf('month');
    const weeks: CalendarDay[][] = [];
    for (let cursor = start; cursor <= end; cursor = cursor.plus({ weeks: 1 })) {
        weeks.push(
            Array.from({ length: 7 }, (_, offset) => {
                const date = cursor.plus({ days: offset });
                return {
                    date: date.toISODate() ?? '',
                    day: date.day,
                    inMonth: date.month === month,
                };
            }),
        );
    }
    return weeks;
}

/** "ma" … "zo" / "Mon" … "Sun", Monday first like the weeks. */
export function weekdayLabels(locale: string): string[] {
    return Info.weekdays('short', { locale });
}

/** "zaterdag 17 oktober 2026": a calendar day read out in full, day first. */
export function longDateLabel(date: IsoDateString, locale: string): string {
    return DateTime.fromISO(date, { zone: TIME_ZONE })
        .setLocale(locale)
        .toFormat('cccc d LLLL yyyy');
}

/**
 * The month a calendar opens on: the chosen day's; with none, the first
 * allowed day's when that is still to come; else this month.
 */
export function openingMonth(
    value: IsoDateString | '',
    min: IsoDateString | undefined,
    today: IsoDateString,
): Month {
    const anchor = value !== '' ? value : min !== undefined && min > today ? min : today;
    const date = DateTime.fromISO(anchor, { zone: TIME_ZONE });
    return { year: date.year, month: date.month };
}

/** Whether a day lies outside the allowed range; either end may be open. */
export function outsideRange(
    date: IsoDateString,
    min?: IsoDateString,
    max?: IsoDateString,
): boolean {
    return (min !== undefined && date < min) || (max !== undefined && date > max);
}
