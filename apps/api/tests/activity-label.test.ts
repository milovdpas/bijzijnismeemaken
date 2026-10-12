import { describe, expect, it } from 'vitest';
import { ActivityLabel, DateMode, OccurrenceStatus, activityRuleProblem } from '@bzim/types';

import { deriveActivityLabel } from '../src/app/domain/utils/ActivityLabel';

const { PLANNED, DONE, CANCELLED } = OccurrenceStatus;

describe('deriveActivityLabel', () => {
    it('is an idea without occurrences', () => {
        expect(deriveActivityLabel(false, [])).toBe(ActivityLabel.IDEA);
        expect(deriveActivityLabel(true, [])).toBe(ActivityLabel.IDEA);
    });

    it('is planned while any occurrence is planned, whatever else happened', () => {
        expect(deriveActivityLabel(false, [PLANNED])).toBe(ActivityLabel.PLANNED);
        expect(deriveActivityLabel(true, [DONE, CANCELLED, PLANNED])).toBe(ActivityLabel.PLANNED);
    });

    it('is done for a one-off whose occurrence was done', () => {
        expect(deriveActivityLabel(false, [DONE])).toBe(ActivityLabel.DONE);
        expect(deriveActivityLabel(false, [CANCELLED, DONE])).toBe(ActivityLabel.DONE);
    });

    it('goes back to idea for a recurring activity between editions, and after a cancellation', () => {
        expect(deriveActivityLabel(true, [DONE, DONE])).toBe(ActivityLabel.IDEA);
        expect(deriveActivityLabel(false, [CANCELLED])).toBe(ActivityLabel.IDEA);
    });
});

describe('activityRuleProblem', () => {
    const base = {
        isRecurring: false,
        dateMode: DateMode.NONE,
        specificDate: null,
        weekday: null,
        periodStart: null,
        periodEnd: null,
        minPeople: null,
        maxPeople: null,
    };

    it('accepts the four consistent shapes', () => {
        expect(activityRuleProblem(base)).toBeNull();
        expect(
            activityRuleProblem({
                ...base,
                dateMode: DateMode.SPECIFIC,
                specificDate: '2026-12-05',
            }),
        ).toBeNull();
        expect(
            activityRuleProblem({
                ...base,
                isRecurring: true,
                dateMode: DateMode.WEEKDAY,
                weekday: 5,
            }),
        ).toBeNull();
        // A period may recur: several evenings out within one summer.
        expect(
            activityRuleProblem({
                ...base,
                isRecurring: true,
                dateMode: DateMode.PERIOD,
                periodStart: '2027-07-01',
                periodEnd: '2027-08-31',
            }),
        ).toBeNull();
    });

    it('needs both days of a period, in order, and only for the period mode', () => {
        const summer = { periodStart: '2027-07-01', periodEnd: '2027-08-31' };
        expect(
            activityRuleProblem({ ...base, dateMode: DateMode.PERIOD, periodStart: '2027-07-01' }),
        ).toBe('PERIOD_MISMATCH');
        expect(activityRuleProblem({ ...base, ...summer })).toBe('PERIOD_MISMATCH');
        expect(
            activityRuleProblem({
                ...base,
                dateMode: DateMode.PERIOD,
                periodStart: summer.periodEnd,
                periodEnd: summer.periodStart,
            }),
        ).toBe('PERIOD_ORDER');
        expect(
            activityRuleProblem({
                ...base,
                dateMode: DateMode.PERIOD,
                periodStart: '2027-07-01',
                periodEnd: '2027-07-01',
            }),
        ).toBeNull();
    });

    it('names what is wrong', () => {
        expect(activityRuleProblem({ ...base, dateMode: DateMode.SPECIFIC })).toBe(
            'SPECIFIC_DATE_MISMATCH',
        );
        expect(activityRuleProblem({ ...base, specificDate: '2026-12-05' })).toBe(
            'SPECIFIC_DATE_MISMATCH',
        );
        expect(activityRuleProblem({ ...base, dateMode: DateMode.WEEKDAY })).toBe(
            'WEEKDAY_MISMATCH',
        );
        expect(activityRuleProblem({ ...base, weekday: 2 })).toBe('WEEKDAY_MISMATCH');
        expect(
            activityRuleProblem({
                ...base,
                isRecurring: true,
                dateMode: DateMode.SPECIFIC,
                specificDate: '2026-12-05',
            }),
        ).toBe('RECURRING_WITH_SPECIFIC_DATE');
        expect(activityRuleProblem({ ...base, minPeople: 6, maxPeople: 4 })).toBe('PEOPLE_RANGE');
    });
});
