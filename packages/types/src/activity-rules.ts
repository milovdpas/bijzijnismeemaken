import { DateMode } from './enums';
import type { Weekday } from './enums';
import type { IsoDateString } from './domain';

/** The fields whose combination has rules; the rest of an activity is free-form. */
export interface ActivityDateFields {
    isRecurring: boolean;
    dateMode: DateMode;
    specificDate: IsoDateString | null;
    weekday: Weekday | null;
    periodStart: IsoDateString | null;
    periodEnd: IsoDateString | null;
    minPeople: number | null;
    maxPeople: number | null;
}

export type ActivityRuleProblem =
    /** `specific` needs a date and the others must not carry one. */
    | 'SPECIFIC_DATE_MISMATCH'
    /** `weekday` needs a weekday and the others must not carry one. */
    | 'WEEKDAY_MISMATCH'
    /** `period` needs both its days and the others must not carry them. */
    | 'PERIOD_MISMATCH'
    /** The period ends before it starts. */
    | 'PERIOD_ORDER'
    /** A recurring activity has no single date; it is `none`, `weekday` or `period`. */
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
    const period = fields.dateMode === DateMode.PERIOD;
    if (period !== (fields.periodStart !== null) || period !== (fields.periodEnd !== null)) {
        return 'PERIOD_MISMATCH';
    }
    // ISO dates compare as strings.
    if (fields.periodStart !== null && fields.periodEnd !== null) {
        if (fields.periodStart > fields.periodEnd) return 'PERIOD_ORDER';
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
