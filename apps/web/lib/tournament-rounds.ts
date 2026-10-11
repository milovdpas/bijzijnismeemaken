import { MatchStage } from '@bzim/types';
import type { TournamentEntryDto, TournamentMatchView } from '@bzim/types';

import { errorKey, refusalProblem } from './api/errors';

/** The sentence for whatever the API refused: the tournament rule by name when it gave one, else the code's. */
export function tournamentErrorKey(error: unknown): string {
    const problem = refusalProblem(error);
    return problem === null ? errorKey(error) : `tournamentProblems.${problem}`;
}

/** Entries by id, to put names on the sides of a match. */
export function entryIndex(
    entries: readonly TournamentEntryDto[],
): Map<string, TournamentEntryDto> {
    return new Map(entries.map((entry) => [entry.id, entry]));
}

export type RoundName = 'final' | 'semi' | 'quarter' | 'round';

/** What a knockout round is called, counted back from the final. */
export function knockoutRoundName(round: number, lastRound: number): RoundName {
    switch (lastRound - round) {
        case 0:
            return 'final';
        case 1:
            return 'semi';
        case 2:
            return 'quarter';
        default:
            return 'round';
    }
}

export interface KnockoutRound {
    round: number;
    name: RoundName;
    /** Top to bottom of the bracket. */
    matches: TournamentMatchView[];
}

/**
 * The knockout as columns, first round first. The third-place match shares
 * the final's round at position 1; it is taken out of the columns and
 * returned apart, so the last column holds the final alone.
 */
export function knockoutRounds(matches: readonly TournamentMatchView[]): {
    rounds: KnockoutRound[];
    thirdPlace: TournamentMatchView | null;
} {
    const knockout = matches.filter((match) => match.stage === MatchStage.KNOCKOUT);
    const lastRound = Math.max(0, ...knockout.map((match) => match.round));
    const thirdPlace =
        knockout.find((match) => match.round === lastRound && match.position === 1) ?? null;
    const rounds: KnockoutRound[] = [];
    for (let round = 1; round <= lastRound; round += 1) {
        rounds.push({
            round,
            name: knockoutRoundName(round, lastRound),
            matches: knockout
                .filter((match) => match.round === round && match !== thirdPlace)
                .sort((a, b) => a.position - b.position),
        });
    }
    return { rounds, thirdPlace };
}

export interface GroupRound {
    round: number;
    matches: TournamentMatchView[];
}

/** One group's round robin, round by round. */
export function groupRounds(
    matches: readonly TournamentMatchView[],
    groupNo: number,
): GroupRound[] {
    const own = matches.filter(
        (match) => match.stage === MatchStage.GROUP && match.groupNo === groupNo,
    );
    const rounds = [...new Set(own.map((match) => match.round))].sort((a, b) => a - b);
    return rounds.map((round) => ({
        round,
        matches: own
            .filter((match) => match.round === round)
            .sort((a, b) => a.position - b.position),
    }));
}
