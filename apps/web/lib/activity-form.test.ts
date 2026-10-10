import { describe, expect, it } from 'vitest';
import { ActivityCategory, DateMode, Daypart, Weekday } from '@bzim/types';

import {
    activityFormProblem,
    activityToForm,
    blankActivityForm,
    toActivityInput,
} from './activity-form';

describe('activityFormProblem', () => {
    it('wants a title first', () => {
        expect(activityFormProblem(blankActivityForm)).toBe('TITLE_LENGTH');
        expect(activityFormProblem({ ...blankActivityForm, title: ' Kaartavond ' })).toBeNull();
    });

    it('rejects numbers that are not numbers', () => {
        expect(
            activityFormProblem({ ...blankActivityForm, title: 'Ok', costPerPerson: 'veel' }),
        ).toBe('INVALID_NUMBER');
        expect(
            activityFormProblem({ ...blankActivityForm, title: 'Ok', costPerPerson: '2,50' }),
        ).toBeNull();
    });

    it('applies the shared cross-field rules', () => {
        expect(
            activityFormProblem({ ...blankActivityForm, title: 'Ok', dateMode: DateMode.SPECIFIC }),
        ).toBe('SPECIFIC_DATE_MISMATCH');
        expect(
            activityFormProblem({
                ...blankActivityForm,
                title: 'Ok',
                minPeople: '6',
                maxPeople: '4',
            }),
        ).toBe('PEOPLE_RANGE');
    });
});

describe('toActivityInput', () => {
    it('trims, nulls empties, parses numbers and drops fields that do not belong to the date mode', () => {
        const input = toActivityInput({
            ...blankActivityForm,
            category: ActivityCategory.HOME,
            title: ' Kaartavond ',
            description: '  ',
            isRecurring: true,
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
            specificDate: '2026-12-05',
            startTime: '19:30',
            costPerPerson: '2,50',
            durationMinutes: '180',
            preferredDayparts: [Daypart.EVENING],
        });
        expect(input).toMatchObject({
            category: ActivityCategory.HOME,
            title: 'Kaartavond',
            description: null,
            isRecurring: true,
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
            specificDate: null,
            startTime: '19:30',
            costPerPerson: 2.5,
            durationMinutes: 180,
            minPeople: null,
            preferredDayparts: [Daypart.EVENING],
        });
    });
});

describe('activityToForm', () => {
    it('round-trips an activity through the form', () => {
        const form = activityToForm({
            id: 'a',
            groupId: 'g',
            category: ActivityCategory.TRIP,
            title: 'Weekend weg',
            description: null,
            imageUrl: null,
            isRecurring: false,
            dateMode: DateMode.SPECIFIC,
            specificDate: '2027-03-06',
            weekday: null,
            startTime: null,
            locationText: 'Ardennen',
            locationUrl: null,
            minPeople: 4,
            maxPeople: null,
            costPerPerson: 120,
            durationMinutes: null,
            externalUrl: null,
            preferredDayparts: null,
            isActive: true,
            creator: null,
            creatorName: 'Milo',
            createdAt: '2026-10-10T10:00:00.000Z',
            updatedAt: '2026-10-10T10:00:00.000Z',
        });
        expect(form.minPeople).toBe('4');
        expect(form.maxPeople).toBe('');
        expect(form.preferredDayparts).toEqual([]);
        expect(toActivityInput(form)).toMatchObject({
            title: 'Weekend weg',
            specificDate: '2027-03-06',
            minPeople: 4,
            maxPeople: null,
            costPerPerson: 120,
            preferredDayparts: null,
        });
    });
});
