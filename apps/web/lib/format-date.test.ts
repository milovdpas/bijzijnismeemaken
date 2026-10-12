import { describe, expect, it } from 'vitest';

import { formatDate, formatPeriod } from './format-date';

describe('formatDate', () => {
    it('shows the Amsterdam calendar day in the chosen language', () => {
        // 23:30 UTC on 2 October is already 3 October in Amsterdam.
        expect(formatDate('2026-10-02T23:30:00.000Z', 'nl')).toBe('3 okt 2026');
        expect(formatDate('2026-10-02T23:30:00.000Z', 'en')).toBe('Oct 3, 2026');
    });

    it('falls back to Dutch', () => {
        expect(formatDate('2026-10-10T12:00:00.000Z', undefined)).toBe('10 okt 2026');
    });
});

describe('formatPeriod', () => {
    it('names the year once, on the last day', () => {
        expect(formatPeriod('2027-07-01', '2027-08-31', 'en')).toEqual({
            start: '1 Jul',
            end: '31 Aug 2027',
        });
    });

    it('names both years when the period crosses into the next', () => {
        expect(formatPeriod('2026-12-27', '2027-01-03', 'en')).toEqual({
            start: '27 Dec 2026',
            end: '3 Jan 2027',
        });
    });
});
