import { describe, expect, it } from 'vitest';
import { Daypart } from '@bzim/types';

import { eventCells } from '../src/app/utils/EventCells';

const at = (iso: string) => new Date(iso);

describe('eventCells', () => {
    it('covers the dayparts a timed event overlaps, touching edges excluded', () => {
        // 11:30 to 13:00 Amsterdam (winter, UTC+1): morning and afternoon.
        expect(
            eventCells(at('2026-11-03T10:30:00Z'), at('2026-11-03T12:00:00Z'), false, null, null),
        ).toEqual([
            ['2026-11-03', Daypart.MORNING],
            ['2026-11-03', Daypart.AFTERNOON],
        ]);
        // 12:00 to 13:00: afternoon only; the morning ended as it began.
        expect(
            eventCells(at('2026-11-03T11:00:00Z'), at('2026-11-03T12:00:00Z'), false, null, null),
        ).toEqual([['2026-11-03', Daypart.AFTERNOON]]);
        // 06:00 to 07:30: before any daypart, so nothing.
        expect(
            eventCells(at('2026-11-03T05:00:00Z'), at('2026-11-03T06:30:00Z'), false, null, null),
        ).toEqual([]);
    });

    it('reads the dayparts on the clock-change day by wall-clock time', () => {
        // 25 October 2026 is CET (UTC+1) by late morning. 11:30 to 12:30: morning and afternoon.
        expect(
            eventCells(at('2026-10-25T10:30:00Z'), at('2026-10-25T11:30:00Z'), false, null, null),
        ).toEqual([
            ['2026-10-25', Daypart.MORNING],
            ['2026-10-25', Daypart.AFTERNOON],
        ]);
        // 29 March 2026 is CEST (UTC+2) by late morning. 07:30 to 08:30: morning only.
        expect(
            eventCells(at('2026-03-29T05:30:00Z'), at('2026-03-29T06:30:00Z'), false, null, null),
        ).toEqual([['2026-03-29', Daypart.MORNING]]);
    });

    it('lands a window across midnight on both days', () => {
        // 22:00 to 01:00 Amsterdam: the evening, then nothing on the next day before 08:00.
        expect(
            eventCells(at('2026-11-03T21:00:00Z'), at('2026-11-04T00:00:00Z'), false, null, null),
        ).toEqual([['2026-11-03', Daypart.EVENING]]);
        // 20:00 to 09:00 the next day.
        expect(
            eventCells(at('2026-11-03T19:00:00Z'), at('2026-11-04T08:00:00Z'), false, null, null),
        ).toEqual([
            ['2026-11-03', Daypart.EVENING],
            ['2026-11-04', Daypart.MORNING],
        ]);
    });

    it('fills every daypart of every day of an all-day event, end exclusive', () => {
        expect(
            eventCells(
                at('2026-07-09T22:00:00Z'),
                at('2026-07-11T22:00:00Z'),
                true,
                '2026-07-10',
                '2026-07-12',
            ),
        ).toEqual([
            ['2026-07-10', Daypart.MORNING],
            ['2026-07-10', Daypart.AFTERNOON],
            ['2026-07-10', Daypart.EVENING],
            ['2026-07-11', Daypart.MORNING],
            ['2026-07-11', Daypart.AFTERNOON],
            ['2026-07-11', Daypart.EVENING],
        ]);
    });

    it('keeps the wall clock across the DST change', () => {
        // 2026-03-29: clocks go forward at 02:00. 09:00 to 10:00 Amsterdam is 07:00 to 08:00 UTC.
        expect(
            eventCells(at('2026-03-29T07:00:00Z'), at('2026-03-29T08:00:00Z'), false, null, null),
        ).toEqual([['2026-03-29', Daypart.MORNING]]);
    });
});
