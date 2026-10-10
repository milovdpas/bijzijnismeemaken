import { describe, expect, it } from 'vitest';
import { ActivityCategory, Daypart, OccurrenceStatus } from '@bzim/types';
import type { GroupAvailabilityDay, GroupOccurrenceDto } from '@bzim/types';

import { cellTone, freeIds, occurrencesInCell } from './group-availability';

const day: GroupAvailabilityDay = {
    date: '2026-11-06',
    dayparts: {
        morning: { busy: [] },
        afternoon: { busy: ['a'] },
        evening: { busy: ['a', 'b'] },
    },
};

function occurrence(partial: Partial<GroupOccurrenceDto>): GroupOccurrenceDto {
    return {
        id: 'o',
        activityId: 'x',
        date: '2026-11-06',
        daypart: null,
        startTime: null,
        status: OccurrenceStatus.PLANNED,
        notes: null,
        plannedBy: null,
        participants: [],
        createdAt: '2026-10-10T10:00:00.000Z',
        activity: {
            id: 'x',
            title: 'Kaartavond',
            category: ActivityCategory.HOME,
            durationMinutes: null,
        },
        conflictsWith: [],
        ...partial,
    };
}

describe('cellTone and freeIds', () => {
    it('counts who is left after the busy ones', () => {
        const users = ['a', 'b', 'c'];
        expect(freeIds(day, Daypart.MORNING, users)).toEqual(['a', 'b', 'c']);
        expect(freeIds(day, Daypart.AFTERNOON, users)).toEqual(['b', 'c']);
        expect(cellTone(3, 3)).toBe('all');
        expect(cellTone(2, 3)).toBe('some');
        expect(cellTone(0, 3)).toBe('none');
        expect(cellTone(0, 0)).toBe('empty');
    });
});

describe('occurrencesInCell', () => {
    it('places an occurrence by its window, all day touching every daypart', () => {
        const evening = occurrence({ id: 'e', daypart: Daypart.EVENING });
        const timed = occurrence({
            id: 't',
            startTime: '11:00',
            activity: {
                id: 'x',
                title: 'Lunch',
                category: ActivityCategory.FOOD_AND_DRINKS,
                durationMinutes: 120,
            },
        });
        const allDay = occurrence({ id: 'd' });
        const otherDay = occurrence({ id: 'o', date: '2026-11-07', daypart: Daypart.MORNING });
        const all = [evening, timed, allDay, otherDay];

        expect(occurrencesInCell(all, '2026-11-06', Daypart.MORNING).map((o) => o.id)).toEqual([
            't',
            'd',
        ]);
        expect(occurrencesInCell(all, '2026-11-06', Daypart.AFTERNOON).map((o) => o.id)).toEqual([
            't',
            'd',
        ]);
        expect(occurrencesInCell(all, '2026-11-06', Daypart.EVENING).map((o) => o.id)).toEqual([
            'e',
            'd',
        ]);
        expect(occurrencesInCell(all, '2026-11-07', Daypart.MORNING).map((o) => o.id)).toEqual([
            'o',
        ]);
    });
});
