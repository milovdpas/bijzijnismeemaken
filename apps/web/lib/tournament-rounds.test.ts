import { describe, expect, it } from 'vitest';
import { ERROR_CODES, MatchStage, MatchStatus } from '@bzim/types';
import type { TournamentMatchView } from '@bzim/types';

import { ApiError } from './api/client';
import {
    entryIndex,
    groupRounds,
    knockoutRoundName,
    knockoutRounds,
    tournamentErrorKey,
} from './tournament-rounds';

function match(
    id: string,
    stage: MatchStage,
    round: number,
    position: number,
    groupNo: number | null = null,
): TournamentMatchView {
    return {
        id,
        stage,
        groupNo,
        round,
        position,
        homeEntryId: null,
        awayEntryId: null,
        homeScore: null,
        awayScore: null,
        winnerEntryId: null,
        status: MatchStatus.PENDING,
        nextMatchId: null,
        nextSlot: null,
        isBye: false,
        playedAt: null,
        canReport: false,
    };
}

describe('tournament rounds', () => {
    it('names the rounds back from the final', () => {
        expect(knockoutRoundName(4, 4)).toBe('final');
        expect(knockoutRoundName(3, 4)).toBe('semi');
        expect(knockoutRoundName(2, 4)).toBe('quarter');
        expect(knockoutRoundName(1, 4)).toBe('round');
    });

    it('lays out the knockout by round, the third-place match apart', () => {
        const matches = [
            match('final', MatchStage.KNOCKOUT, 2, 0),
            match('semi-b', MatchStage.KNOCKOUT, 1, 1),
            match('third', MatchStage.KNOCKOUT, 2, 1),
            match('semi-a', MatchStage.KNOCKOUT, 1, 0),
            match('group', MatchStage.GROUP, 1, 0, 1),
        ];
        const { rounds, thirdPlace } = knockoutRounds(matches);
        expect(rounds.map((round) => [round.name, round.matches.map((m) => m.id)])).toEqual([
            ['semi', ['semi-a', 'semi-b']],
            ['final', ['final']],
        ]);
        expect(thirdPlace?.id).toBe('third');
        expect(knockoutRounds([match('g', MatchStage.GROUP, 1, 0, 1)]).rounds).toEqual([]);
    });

    it('orders one group by round and position', () => {
        const matches = [
            match('b2', MatchStage.GROUP, 2, 0, 1),
            match('a1', MatchStage.GROUP, 1, 1, 1),
            match('a0', MatchStage.GROUP, 1, 0, 1),
            match('other', MatchStage.GROUP, 1, 0, 2),
        ];
        expect(groupRounds(matches, 1).map((r) => [r.round, r.matches.map((m) => m.id)])).toEqual([
            [1, ['a0', 'a1']],
            [2, ['b2']],
        ]);
    });

    it('finds entries by id', () => {
        const index = entryIndex([{ id: 'e1', name: 'Anna', seed: 1, groupNo: null, members: [] }]);
        expect(index.get('e1')?.name).toBe('Anna');
    });

    it('names a refusal by its tournament rule, else by its code', () => {
        const refused = new ApiError(ERROR_CODES.CONFLICT, 409, 'no', { problem: 'NOT_DRAFT' });
        expect(tournamentErrorKey(refused)).toBe('tournamentProblems.NOT_DRAFT');
        expect(tournamentErrorKey(new ApiError(ERROR_CODES.FORBIDDEN, 403, 'no'))).toBe(
            'errors.FORBIDDEN',
        );
    });
});
