import { describe, expect, it } from 'vitest';
import { EditMode, LeaderboardPeriod, ScoreType, SortOrder } from '@bzim/types';
import type { LeaderboardDetailDto } from '@bzim/types';

import {
    blankLeaderboardForm,
    leaderboardFormProblem,
    leaderboardToForm,
    toLeaderboardInput,
} from './leaderboard-form';

const BOARD: LeaderboardDetailDto = {
    id: 'b1',
    groupId: 'g1',
    name: 'Klaverjassen',
    description: null,
    scoreType: ScoreType.TIME,
    sortOrder: SortOrder.ASC,
    editMode: EditMode.SELECTED,
    showMonthly: false,
    showYearly: true,
    showAllTime: true,
    showSteppers: false,
    cardPeriod: LeaderboardPeriod.YEARLY,
    creator: null,
    creatorName: 'Milo',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
    memberCount: 0,
    top: [],
    canManage: true,
    canEditScores: true,
    members: [],
    editors: [{ id: 'u1', handle: 'anna', displayName: 'Anna', avatarKey: 'cat' }],
};

describe('leaderboardFormProblem', () => {
    it('wants a name, then at least one period', () => {
        expect(leaderboardFormProblem(blankLeaderboardForm)).toBe('NAME_LENGTH');
        expect(leaderboardFormProblem({ ...blankLeaderboardForm, name: ' Ok ' })).toBeNull();
        expect(
            leaderboardFormProblem({
                ...blankLeaderboardForm,
                name: 'Ok',
                showMonthly: false,
                showYearly: false,
                showAllTime: false,
            }),
        ).toBe('NO_PERIOD');
    });
});

describe('toLeaderboardInput', () => {
    it('trims, nulls an empty description, and sends editors only for the selected mode', () => {
        expect(
            toLeaderboardInput({
                ...blankLeaderboardForm,
                name: ' Darts ',
                description: '  ',
                editorIds: ['u1'],
            }),
        ).toMatchObject({ name: 'Darts', description: null, editorIds: [] });
        expect(
            toLeaderboardInput({
                ...blankLeaderboardForm,
                name: 'Darts',
                editMode: EditMode.SELECTED,
                editorIds: ['u1'],
            }).editorIds,
        ).toEqual(['u1']);
    });

    it('never sends steppers for a time board', () => {
        expect(
            toLeaderboardInput({
                ...blankLeaderboardForm,
                name: 'Run',
                scoreType: ScoreType.TIME,
                showSteppers: true,
            }).showSteppers,
        ).toBe(false);
        expect(
            toLeaderboardInput({ ...blankLeaderboardForm, name: 'Darts', showSteppers: true })
                .showSteppers,
        ).toBe(true);
    });
});

describe('toLeaderboardInput card period', () => {
    it('keeps the chosen period while it is shown, else falls back to the first shown', () => {
        const form = { ...blankLeaderboardForm, name: 'Ok', cardPeriod: LeaderboardPeriod.MONTHLY };
        expect(toLeaderboardInput(form).cardPeriod).toBe(LeaderboardPeriod.MONTHLY);
        expect(toLeaderboardInput({ ...form, showMonthly: false }).cardPeriod).toBe(
            LeaderboardPeriod.YEARLY,
        );
        expect(
            toLeaderboardInput({ ...form, showMonthly: false, showYearly: false }).cardPeriod,
        ).toBe(LeaderboardPeriod.TOTAL);
    });
});

describe('leaderboardToForm', () => {
    it('round-trips a board', () => {
        const form = leaderboardToForm(BOARD);
        expect(form).toMatchObject({
            name: 'Klaverjassen',
            description: '',
            scoreType: ScoreType.TIME,
            sortOrder: SortOrder.ASC,
            editMode: EditMode.SELECTED,
            editorIds: ['u1'],
            showMonthly: false,
            cardPeriod: LeaderboardPeriod.YEARLY,
        });
        expect(toLeaderboardInput(form)).toMatchObject({
            name: 'Klaverjassen',
            editorIds: ['u1'],
            showSteppers: false,
        });
    });
});
