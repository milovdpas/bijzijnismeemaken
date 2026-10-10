import { DateMode } from './enums';
import type { Weekday } from './enums';
import type { IsoDateString } from './domain';

/** The fields whose combination has rules; the rest of an activity is free-form. */
export interface ActivityDateFields {
    isRecurring: boolean;
    dateMode: DateMode;
    specificDate: IsoDateString | null;
    weekday: Weekday | null;
    minPeople: number | null;
    maxPeople: number | null;
}

export type ActivityRuleProblem =
    /** `specific` needs a date and the others must not carry one. */
    | 'SPECIFIC_DATE_MISMATCH'
    /** `weekday` needs a weekday and the others must not carry one. */
    | 'WEEKDAY_MISMATCH'
    /** A recurring activity has no single date; it is `none` or `weekday`. */
    | 'RECURRING_WITH_SPECIFIC_DATE'
    /** Minimum above maximum. */
    | 'PEOPLE_RANGE';

/**
 * The cross-field rules of an activity, shared by the API's validator and
 * service and by the web form, so "why is Save disabled" and "why 422" are
 * one answer. Null when everything agrees.
 */
export function activityRuleProblem(fields: ActivityDateFields): ActivityRuleProblem | null {
    const hasDate = fields.specificDate !== null;
    const hasWeekday = fields.weekday !== null;

    if (fields.isRecurring && fields.dateMode === DateMode.SPECIFIC) {
        return 'RECURRING_WITH_SPECIFIC_DATE';
    }
    if ((fields.dateMode === DateMode.SPECIFIC) !== hasDate) {
        return 'SPECIFIC_DATE_MISMATCH';
    }
    if ((fields.dateMode === DateMode.WEEKDAY) !== hasWeekday) {
        return 'WEEKDAY_MISMATCH';
    }
    if (
        fields.minPeople !== null &&
        fields.maxPeople !== null &&
        fields.minPeople > fields.maxPeople
    ) {
        return 'PEOPLE_RANGE';
    }
    return null;
}
