import { describe, expect, it } from 'vitest';
import { Daypart, occurrenceWindow, windowsOverlap } from '@bzim/types';

describe('occurrenceWindow', () => {
    it('runs from the start time for the duration, two hours by default', () => {
        expect(occurrenceWindow(null, '19:30', null)).toEqual({
            startMinute: 1170,
            endMinute: 1290,
        });
        expect(occurrenceWindow(Daypart.MORNING, '09:00', 30)).toEqual({
            startMinute: 540,
            endMinute: 570,
        });
    });

    it('takes the daypart range when there is no start time', () => {
        expect(occurrenceWindow(Daypart.EVENING, null, 60)).toEqual({
            startMinute: 1080,
            endMinute: 1440,
        });
    });

    it('is all day with neither', () => {
        expect(occurrenceWindow(null, null, null)).toBeNull();
    });
});

describe('windowsOverlap', () => {
    it('treats touching edges as free and all-day as always busy', () => {
        const morning = occurrenceWindow(Daypart.MORNING, null, null);
        const afternoon = occurrenceWindow(Daypart.AFTERNOON, null, null);
        const lateMorning = occurrenceWindow(null, '11:00', 90);
        expect(windowsOverlap(morning, afternoon)).toBe(false);
        expect(windowsOverlap(morning, lateMorning)).toBe(true);
        expect(windowsOverlap(afternoon, lateMorning)).toBe(true);
        expect(windowsOverlap(null, afternoon)).toBe(true);
    });
});
