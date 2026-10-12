import { describe, expect, it } from 'vitest';

import {
    calendarWeeks,
    formatDateInput,
    longDateLabel,
    maskDateInput,
    openingMonth,
    outsideRange,
    parseDateInput,
    weekdayLabels,
} from './date-input';

describe('formatDateInput', () => {
    it('writes day, month, year whatever the device', () => {
        expect(formatDateInput('2026-10-17')).toBe('17/10/2026');
        expect(formatDateInput('')).toBe('');
        expect(formatDateInput('nonsense')).toBe('');
    });
});

describe('maskDateInput', () => {
    it('puts the slashes in while typing digits', () => {
        expect(maskDateInput('1')).toBe('1');
        expect(maskDateInput('17')).toBe('17');
        expect(maskDateInput('171')).toBe('17/1');
        expect(maskDateInput('17102026')).toBe('17/10/2026');
        expect(maskDateInput('1710202699')).toBe('17/10/2026');
    });

    it('pads a lone digit before a typed separator and takes dashes and dots too', () => {
        expect(maskDateInput('1/')).toBe('01');
        expect(maskDateInput('1/2/2027')).toBe('01/02/2027');
        expect(maskDateInput('1-2-2027')).toBe('01/02/2027');
        expect(maskDateInput('17.10.2026')).toBe('17/10/2026');
    });

    it('never adds a trailing slash, so deleting one sticks', () => {
        expect(maskDateInput('17/')).toBe('17');
        expect(maskDateInput('17/10/')).toBe('17/10');
    });
});

describe('parseDateInput', () => {
    it('reads a whole, real date', () => {
        expect(parseDateInput('17/10/2026')).toBe('2026-10-17');
        expect(parseDateInput(' 29/02/2028 ')).toBe('2028-02-29');
    });

    it('tells empty from not a date yet', () => {
        expect(parseDateInput('')).toBeNull();
        expect(parseDateInput('17/10')).toBeUndefined();
        expect(parseDateInput('31/02/2027')).toBeUndefined();
        expect(parseDateInput('10/17/2026')).toBeUndefined();
    });
});

describe('calendarWeeks', () => {
    it('starts on a Monday and pads the month with its neighbours', () => {
        // October 2026 starts on a Thursday and ends on a Saturday.
        const weeks = calendarWeeks({ year: 2026, month: 10 });
        expect(weeks).toHaveLength(5);
        expect(weeks[0]?.[0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false });
        expect(weeks[0]?.[3]).toEqual({ date: '2026-10-01', day: 1, inMonth: true });
        expect(weeks[4]?.[6]).toEqual({ date: '2026-11-01', day: 1, inMonth: false });
        expect(weeks.every((week) => week.length === 7)).toBe(true);
    });

    it('spans six weeks when the month needs them', () => {
        // August 2027 starts on a Sunday.
        expect(calendarWeeks({ year: 2027, month: 8 })).toHaveLength(6);
    });
});

describe('openingMonth and longDateLabel', () => {
    it('opens on the chosen day, else a later first allowed day, else today', () => {
        expect(openingMonth('2027-02-01', undefined, '2026-10-12')).toEqual({
            year: 2027,
            month: 2,
        });
        expect(openingMonth('', '2027-07-01', '2026-10-12')).toEqual({ year: 2027, month: 7 });
        expect(openingMonth('', '2026-01-01', '2026-10-12')).toEqual({ year: 2026, month: 10 });
    });

    it('reads a day out in full, day first', () => {
        expect(longDateLabel('2026-10-17', 'en')).toBe('Saturday 17 October 2026');
        expect(longDateLabel('2026-10-17', 'nl')).toBe('zaterdag 17 oktober 2026');
    });
});

describe('weekdayLabels and outsideRange', () => {
    it('labels the week Monday first and checks either open end', () => {
        expect(weekdayLabels('en')[0]).toBe('Mon');
        expect(weekdayLabels('en')).toHaveLength(7);
        expect(outsideRange('2026-10-17', '2026-10-18')).toBe(true);
        expect(outsideRange('2026-10-17', undefined, '2026-10-16')).toBe(true);
        expect(outsideRange('2026-10-17', '2026-10-17', '2026-10-17')).toBe(false);
        expect(outsideRange('2026-10-17')).toBe(false);
    });
});
