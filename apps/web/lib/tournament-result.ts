import { MatchStage, MatchStatus, TOURNAMENT } from '@bzim/types';
import type { TournamentMatchView } from '@bzim/types';

/** A side's score as typed: a whole number from 0 to the maximum, else null. */
export function parseScore(text: string): number | null {
    const trimmed = text.trim();
    if (!/^\d{1,4}$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return value <= TOURNAMENT.SCORE_MAX ? value : null;
}

export type ResultProblem = 'SCORE' | 'DRAW_IN_KNOCKOUT';

/** What is wrong with a typed result, or null. The API refuses the same two things. */
export function resultProblem(
    home: number | null,
    away: number | null,
    stage: MatchStage,
): ResultProblem | null {
    if (home === null || away === null) return 'SCORE';
    if (stage === MatchStage.KNOCKOUT && home === away) return 'DRAW_IN_KNOCKOUT';
    return null;
}

/** How far the group stage is: its matches played, out of all of them. */
export function groupProgress(matches: readonly TournamentMatchView[]): {
    played: number;
    total: number;
} {
    const group = matches.filter((match) => match.stage === MatchStage.GROUP);
    return {
        played: group.filter((match) => match.status === MatchStatus.PLAYED).length,
        total: group.length,
    };
}
