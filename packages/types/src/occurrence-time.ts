import { ACTIVITY, DAYPARTS } from './constants';
import type { Daypart } from './enums';
import type { LocalTimeString } from './domain';

/**
 * When on its day an occurrence takes place, as minutes since midnight in
 * Europe/Amsterdam. `null` means the whole day.
 *
 * The rule from docs/06: a start time wins and runs for the activity's
 * duration (two hours when it has none); otherwise the daypart's range;
 * otherwise all day. Shared by the API (ICS, conflict flags) and the web
 * app (availability overlay), so both draw the same block.
 */
export interface DayWindow {
    startMinute: number;
    endMinute: number;
}

export function occurrenceWindow(
    daypart: Daypart | null,
    startTime: LocalTimeString | null,
    durationMinutes: number | null,
): DayWindow | null {
    if (startTime !== null) {
        const [hours = 0, minutes = 0] = startTime.split(':').map(Number);
        const start = hours * 60 + minutes;
        return {
            startMinute: start,
            endMinute: start + (durationMinutes ?? ACTIVITY.DEFAULT_DURATION_MINUTES),
        };
    }
    if (daypart !== null) {
        const range = DAYPARTS[daypart];
        return { startMinute: range.startHour * 60, endMinute: range.endHour * 60 };
    }
    return null;
}

/** Whether two occurrences on the same day compete for the same time. An all-day one competes with everything. */
export function windowsOverlap(a: DayWindow | null, b: DayWindow | null): boolean {
    if (a === null || b === null) return true;
    return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}
