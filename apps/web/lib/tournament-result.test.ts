import { describe, expect, it } from 'vitest';
import { MatchStage, MatchStatus } from '@bzim/types';
import type { TournamentMatchView } from '@bzim/types';

import { groupProgress, parseScore, resultProblem } from './tournament-result';

describe('tournament results', () => {
    it('reads whole scores within bounds only', () => {
        expect(parseScore(' 21 ')).toBe(21);
        expect(parseScore('0')).toBe(0);
        expect(parseScore('999')).toBe(999);
        expect(parseScore('1000')).toBeNull();
        expect(parseScore('')).toBeNull();
        expect(parseScore('2.5')).toBeNull();
        expect(parseScore('-1')).toBeNull();
    });

    it('needs both scores, and a winner in the knockout', () => {
        expect(resultProblem(null, 3, MatchStage.GROUP)).toBe('SCORE');
        expect(resultProblem(2, 2, MatchStage.GROUP)).toBeNull();
        expect(resultProblem(2, 2, MatchStage.KNOCKOUT)).toBe('DRAW_IN_KNOCKOUT');
        expect(resultProblem(3, 2, MatchStage.KNOCKOUT)).toBeNull();
    });

    it('counts the group matches played', () => {
        const match = (stage: MatchStage, status: MatchStatus) =>
            ({ stage, status }) as TournamentMatchView;
        expect(
            groupProgress([
                match(MatchStage.GROUP, MatchStatus.PLAYED),
                match(MatchStage.GROUP, MatchStatus.PENDING),
                match(MatchStage.KNOCKOUT, MatchStatus.PLAYED),
            ]),
        ).toEqual({ played: 1, total: 2 });
    });
});
