import { DateTime } from 'luxon';
import { DAYPARTS, DAYPART_ORDER, TIME_ZONE } from '@bzim/types';
import type { Daypart, IsoDateString } from '@bzim/types';

import { atMinute } from './CalendarLinks';

/** A day and a daypart an event makes busy. */
export type EventCell = [IsoDateString, Daypart];

/**
 * Which dayparts an event covers (docs/06 step 3). An all-day event takes
 * every daypart of every date it spans, the end date exclusive. A timed
 * event is read on the Amsterdam clock and overlaps a daypart when
 * `start < daypartEnd && end > daypartStart`, so touching edges do not
 * count and a window across midnight lands on both days. Pure.
 */
export function eventCells(
    startAt: Date,
    endAt: Date,
    allDay: boolean,
    startDate: IsoDateString | null,
    endDate: IsoDateString | null,
): EventCell[] {
    const cells: EventCell[] = [];
    if (allDay && startDate !== null && endDate !== null) {
        for (
            let day = DateTime.fromISO(startDate, { zone: TIME_ZONE });
            (day.toISODate() ?? '') < endDate;
            day = day.plus({ days: 1 })
        ) {
            for (const daypart of DAYPART_ORDER) cells.push([day.toISODate() ?? '', daypart]);
        }
        return cells;
    }
    const start = DateTime.fromJSDate(startAt).setZone(TIME_ZONE);
    const end = DateTime.fromJSDate(endAt).setZone(TIME_ZONE);
    if (end <= start) return cells;
    // The last day the window touches: an end exactly at midnight belongs to the day before.
    const lastDay = end.minus({ milliseconds: 1 }).startOf('day');
    for (let day = start.startOf('day'); day <= lastDay; day = day.plus({ days: 1 })) {
        for (const daypart of DAYPART_ORDER) {
            const range = DAYPARTS[daypart];
            const from = atMinute(day, range.startHour * 60);
            const to = atMinute(day, range.endHour * 60);
            if (start < to && end > from) cells.push([day.toISODate() ?? '', daypart]);
        }
    }
    return cells;
}
