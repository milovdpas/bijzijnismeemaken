import { describe, expect, it } from 'vitest';
import { EditMode, LeaderboardPeriod, ScoreType, SortOrder } from '@bzim/types';
import type { GroupMemberResponse, LeaderboardDetailDto } from '@bzim/types';

import {
    blankLeaderboardForm,
    leaderboardFormProblem,
    gameBoardForm,
    gameBoardName,
    leaderboardToForm,
    toCreateLeaderboardInput,
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
    isPrivate: false,
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

describe('toCreateLeaderboardInput', () => {
    it('sends the people on a private board and no editors, and nothing extra otherwise', () => {
        const form = {
            ...blankLeaderboardForm,
            name: 'Anna tegen Bob',
            editMode: EditMode.SELECTED,
            editorIds: ['u1'],
            memberIds: ['u2'],
        };
        expect(toCreateLeaderboardInput(form)).not.toHaveProperty('isPrivate');
        expect(toCreateLeaderboardInput(form)).not.toHaveProperty('memberIds');
        expect(toCreateLeaderboardInput({ ...form, isPrivate: true })).toMatchObject({
            isPrivate: true,
            memberIds: ['u2'],
            editMode: EditMode.EVERYONE,
            editorIds: [],
        });
    });
});

describe('gameBoardName', () => {
    it('pits two players against each other and lists more', () => {
        expect(gameBoardName(['Milo', 'Anna'], 'vs', 'en')).toBe('Milo vs Anna');
        expect(gameBoardName(['Milo', 'Anna', 'Bob'], 'tegen', 'nl')).toBe('Milo, Anna en Bob');
        expect(gameBoardName(['x'.repeat(40), 'y'.repeat(40)], 'vs', 'en')).toHaveLength(60);
    });
});

describe('gameBoardForm', () => {
    const member = (id: string, displayName: string) =>
        ({ user: { id, handle: id, displayName, avatarKey: 'cat' } }) as GroupMemberResponse;
    const members = [member('me', 'Milo'), member('u1', 'Anna'), member('u2', 'Bob')];

    it('puts the members of a game on a private board and the rest on as guests', () => {
        const form = gameBoardForm(['Milo', 'anna', 'Opa Jan'], members, 'me', 'Milo vs Anna');
        expect(form).toMatchObject({
            name: 'Milo vs Anna',
            isPrivate: true,
            showSteppers: true,
            memberIds: ['u1'],
            guestNames: ['Opa Jan'],
        });
        expect(toCreateLeaderboardInput(form)).toMatchObject({
            memberIds: ['u1'],
            guestNames: ['Opa Jan'],
        });
    });

    it('fills the places members first', () => {
        const guests = Array.from({ length: 10 }, (_, index) => `Gast ${String(index)}`);
        const form = gameBoardForm(['Anna', 'Bob', ...guests], members, 'me', 'Avond');
        expect(form.memberIds).toEqual(['u1', 'u2']);
        expect(form.guestNames).toHaveLength(5);
    });
});
