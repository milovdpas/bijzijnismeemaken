import { describe, expect, it } from 'vitest';

import { dayLabel, isWeekend, monthLabel, monthRange, shiftMonth } from './month';

describe('month helpers', () => {
    it('ranges a month from its first to its last day', () => {
        expect(monthRange({ year: 2026, month: 2 })).toEqual({
            from: '2026-02-01',
            to: '2026-02-28',
        });
        expect(monthRange({ year: 2028, month: 2 })).toEqual({
            from: '2028-02-01',
            to: '2028-02-29',
        });
    });

    it('shifts across year boundaries', () => {
        expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
        expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    });

    it('labels in the chosen language', () => {
        expect(monthLabel({ year: 2026, month: 11 }, 'nl')).toBe('november 2026');
        expect(monthLabel({ year: 2026, month: 11 }, 'en')).toBe('November 2026');
        expect(dayLabel('2026-11-02', 'nl')).toBe('ma 2');
        expect(dayLabel('2026-11-02', 'en')).toBe('Mon 2');
    });

    it('knows the weekend', () => {
        expect(isWeekend('2026-11-07')).toBe(true);
        expect(isWeekend('2026-11-08')).toBe(true);
        expect(isWeekend('2026-11-09')).toBe(false);
    });
});
