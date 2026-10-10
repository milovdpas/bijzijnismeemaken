import { ActivityLabel, OccurrenceStatus } from '@bzim/types';

/**
 * The derived state of an activity, from docs/01 §1.3.
 *
 * Planned wins: as long as one occurrence is still planned, past or future,
 * the activity is on the agenda (a past one awaits confirmation). A one-off
 * whose occurrence was done is done. Everything else, including a recurring
 * activity between two editions, is an idea waiting for a date.
 */
export function deriveActivityLabel(
    isRecurring: boolean,
    occurrenceStatuses: readonly OccurrenceStatus[],
): ActivityLabel {
    if (occurrenceStatuses.includes(OccurrenceStatus.PLANNED)) {
        return ActivityLabel.PLANNED;
    }
    if (!isRecurring && occurrenceStatuses.includes(OccurrenceStatus.DONE)) {
        return ActivityLabel.DONE;
    }
    return ActivityLabel.IDEA;
}
