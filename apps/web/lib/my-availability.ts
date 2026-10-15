import type { Daypart, MyAvailabilityDay } from '@bzim/types';

/**
 * What one grid cell shows. `rule` is busy by the week schedule, `manual`
 * busy by hand, `freed` free by hand on a day the week schedule says busy.
 */
export type CellState = 'free' | 'freed' | 'manual' | 'rule' | 'calendar';

/** What a tap asks of a date's daypart: block it, free it from a rule, or undo either. */
export type BlockChangeKind = 'busy' | 'free' | 'clear';

/**
 * Whether a weekly rule was freed by hand on this date. Read gently: the web
 * and the API deploy side by side, and an API from before free days sends
 * no `freed` at all; the grid must not fall over in those minutes.
 */
function isFreed(day: MyAvailabilityDay, daypart: Daypart): boolean {
    const freed = day.freed as MyAvailabilityDay['freed'] | undefined;
    return freed?.[daypart] === true;
}

/** A date's daypart as the month grid shows it: why it is busy, else whether a rule was freed. */
export function cellState(day: MyAvailabilityDay, daypart: Daypart): CellState {
    return day.dayparts[daypart] ?? (isFreed(day, daypart) ? 'freed' : 'free');
}

/**
 * What a tap in the month grid does: a free daypart gets blocked, a block or
 * a freed day goes back to what the schedule says, a scheduled busy daypart
 * is freed for that date alone (a holiday). A calendar appointment is the
 * calendar's to change, and the ignore rules', so a tap there does nothing.
 */
export function changeForTap(state: CellState): BlockChangeKind | null {
    switch (state) {
        case 'free':
            return 'busy';
        case 'manual':
        case 'freed':
            return 'clear';
        case 'rule':
            return 'free';
        case 'calendar':
            return null;
    }
}

/**
 * The day as it will look once a change lands, for the screen to show at
 * once. Undoing a freed day brings the rule back; anything the calendar
 * says is filled in when the API answers.
 */
export function applyChange(
    day: MyAvailabilityDay,
    daypart: Daypart,
    change: BlockChangeKind,
): MyAvailabilityDay {
    const reason =
        change === 'busy' ? 'manual' : change === 'clear' && isFreed(day, daypart) ? 'rule' : null;
    return {
        ...day,
        dayparts: { ...day.dayparts, [daypart]: reason },
        freed: { ...day.freed, [daypart]: change === 'free' },
    };
}
