import { describe, expect, it } from 'vitest';
import { EditMode, LeaderboardPeriod, ScoreType, SortOrder } from '@bzim/types';
import type { LeaderboardListingDto, LeaderboardMemberDto } from '@bzim/types';

import { boardFitsGame, memberForPlayer, winBoards } from './post-win';

function board(overrides: Partial<LeaderboardListingDto>): LeaderboardListingDto {
    return {
        id: 'b1',
        groupId: 'g1',
        name: 'Anna tegen Bob',
        description: null,
        scoreType: ScoreType.NUMBER,
        sortOrder: SortOrder.DESC,
        editMode: EditMode.EVERYONE,
        showMonthly: true,
        showYearly: true,
        showAllTime: true,
        showSteppers: true,
        cardPeriod: LeaderboardPeriod.TOTAL,
        isPrivate: true,
        creator: null,
        creatorName: 'Anna',
        createdAt: '2026-10-12T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
        memberCount: 2,
        top: [],
        canManage: true,
        canEditScores: true,
        ...overrides,
    };
}

function member(id: string, displayName: string, removed = false): LeaderboardMemberDto {
    return {
        id,
        user: null,
        displayName,
        avatarKey: 'cat',
        addedAt: '2026-10-12T10:00:00.000Z',
        removedAt: removed ? '2026-10-12T11:00:00.000Z' : null,
    };
}

describe('winBoards', () => {
    it('offers only private points boards the viewer may score on', () => {
        const boards = [
            board({ id: 'private' }),
            board({ id: 'group', isPrivate: false }),
            board({ id: 'timed', scoreType: ScoreType.TIME }),
            board({ id: 'readonly', canEditScores: false }),
        ];
        expect(winBoards(boards).map((candidate) => candidate.id)).toEqual(['private']);
    });
});

describe('memberForPlayer', () => {
    it('finds the winner by name regardless of case, never a removed member', () => {
        const members = [member('m1', 'Anna', true), member('m2', 'anna'), member('m3', 'Bob')];
        expect(memberForPlayer(members, { id: 'p1', name: 'ANNA', avatarKey: null })?.id).toBe(
            'm2',
        );
        expect(memberForPlayer(members, { id: 'p2', name: 'Cas', avatarKey: null })).toBeNull();
    });
});

describe('boardFitsGame', () => {
    it('fits only when everybody who played is on the board', () => {
        const members = [member('m1', 'Anna'), member('m2', 'Bob'), member('m3', 'Cas', true)];
        const anna = { id: 'p1', name: 'Anna', avatarKey: null };
        const bob = { id: 'p2', name: 'bob', avatarKey: null };
        const cas = { id: 'p3', name: 'Cas', avatarKey: null };
        expect(boardFitsGame(members, [anna, bob])).toBe(true);
        expect(boardFitsGame(members, [anna])).toBe(true);
        // Cas was taken off the board, so a game with Cas does not belong here.
        expect(boardFitsGame(members, [anna, cas])).toBe(false);
    });
});
