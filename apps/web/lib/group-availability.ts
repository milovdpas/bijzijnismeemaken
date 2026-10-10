import { occurrenceWindow, windowsOverlap } from '@bzim/types';
import type { Daypart, GroupAvailabilityDay, GroupOccurrenceDto, Uuid } from '@bzim/types';

/** How full a cell is, for its colour: everyone free, nobody free, or in between. */
export type CellTone = 'all' | 'some' | 'none' | 'empty';

export function cellTone(free: number, total: number): CellTone {
    if (total === 0) return 'empty';
    if (free === total) return 'all';
    if (free === 0) return 'none';
    return 'some';
}

/** Who is free in one cell: everyone in the matrix minus the busy ids. */
export function freeIds(day: GroupAvailabilityDay, daypart: Daypart, userIds: Uuid[]): Uuid[] {
    const busy = new Set(day.dayparts[daypart].busy);
    return userIds.filter((id) => !busy.has(id));
}

/**
 * The planned occurrences that touch a cell: same date, and a time window
 * overlapping the daypart (an all-day one touches all three). Uses the same
 * rule the API uses for its conflict flags, so the overlay and the flags agree.
 */
export function occurrencesInCell(
    occurrences: GroupOccurrenceDto[],
    date: string,
    daypart: Daypart,
): GroupOccurrenceDto[] {
    const cell = occurrenceWindow(daypart, null, null);
    return occurrences.filter(
        (occurrence) =>
            occurrence.date === date &&
            windowsOverlap(
                cell,
                occurrenceWindow(
                    occurrence.daypart,
                    occurrence.startTime,
                    occurrence.activity.durationMinutes,
                ),
            ),
    );
}
