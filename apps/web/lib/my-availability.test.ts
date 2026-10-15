import { describe, expect, it } from 'vitest';
import { Daypart } from '@bzim/types';
import type { MyAvailabilityDay } from '@bzim/types';

import { applyChange, cellState, changeForTap } from './my-availability';

function day(
    dayparts: Partial<MyAvailabilityDay['dayparts']>,
    freed: Partial<MyAvailabilityDay['freed']> = {},
): MyAvailabilityDay {
    return {
        date: '2026-11-02',
        dayparts: {
            [Daypart.MORNING]: null,
            [Daypart.AFTERNOON]: null,
            [Daypart.EVENING]: null,
            ...dayparts,
        },
        freed: {
            [Daypart.MORNING]: false,
            [Daypart.AFTERNOON]: false,
            [Daypart.EVENING]: false,
            ...freed,
        },
        calendarTitles: {
            [Daypart.MORNING]: [],
            [Daypart.AFTERNOON]: [],
            [Daypart.EVENING]: [],
        },
    };
}

describe('cellState', () => {
    it('shows the busy reason first, then whether a rule was freed', () => {
        const monday = day(
            { [Daypart.MORNING]: 'rule', [Daypart.EVENING]: 'calendar' },
            { [Daypart.AFTERNOON]: true, [Daypart.EVENING]: true },
        );
        expect(cellState(monday, Daypart.MORNING)).toBe('rule');
        expect(cellState(monday, Daypart.AFTERNOON)).toBe('freed');
        // Freed from the rule, but the calendar still says busy.
        expect(cellState(monday, Daypart.EVENING)).toBe('calendar');
        expect(cellState(day({}), Daypart.MORNING)).toBe('free');
    });
});

describe('changeForTap', () => {
    it('blocks a free daypart, frees a scheduled one, undoes either, leaves the calendar alone', () => {
        expect(changeForTap('free')).toBe('busy');
        expect(changeForTap('manual')).toBe('clear');
        expect(changeForTap('rule')).toBe('free');
        expect(changeForTap('freed')).toBe('clear');
        expect(changeForTap('calendar')).toBeNull();
    });
});

describe('applyChange', () => {
    it('shows a block, a freed day, and the rule back once a freed day is undone', () => {
        const blocked = applyChange(day({}), Daypart.MORNING, 'busy');
        expect(cellState(blocked, Daypart.MORNING)).toBe('manual');
        expect(cellState(applyChange(blocked, Daypart.MORNING, 'clear'), Daypart.MORNING)).toBe(
            'free',
        );

        const freed = applyChange(day({ [Daypart.MORNING]: 'rule' }), Daypart.MORNING, 'free');
        expect(cellState(freed, Daypart.MORNING)).toBe('freed');
        expect(cellState(applyChange(freed, Daypart.MORNING, 'clear'), Daypart.MORNING)).toBe(
            'rule',
        );
    });
});
