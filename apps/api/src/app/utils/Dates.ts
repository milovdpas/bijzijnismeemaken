import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { IsoDateString } from '@bzim/types';

/**
 * Wall-clock helpers in the app's one time zone. Everything that asks "what
 * day is it" goes through here, so a server in UTC and a laptop in Amsterdam
 * agree on when a day starts.
 */

/** Today's calendar date in Europe/Amsterdam, `YYYY-MM-DD`. */
export function today(): IsoDateString {
    const date = DateTime.now().setZone(TIME_ZONE).toISODate();
    if (date === null) {
        throw new Error('The clock produced no date');
    }
    return date;
}
