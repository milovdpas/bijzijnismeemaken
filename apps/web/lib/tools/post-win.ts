import { ScoreType } from '@bzim/types';
import type { LeaderboardListingDto, LeaderboardMemberDto } from '@bzim/types';

import type { ToolPlayer } from './players';

/**
 * Where a finished game can go: the viewer's private boards that count
 * points. A group board keeps its own way of entering scores (docs/07 M5).
 */
export function winBoards(boards: readonly LeaderboardListingDto[]): LeaderboardListingDto[] {
    return boards.filter(
        (board) => board.isPrivate && board.canEditScores && board.scoreType === ScoreType.NUMBER,
    );
}

/**
 * The player on the board: the active member with the same name, regardless
 * of case, which is how the tool knows a group member too. Null when nobody
 * matches.
 */
export function memberForPlayer(
    members: readonly LeaderboardMemberDto[],
    player: ToolPlayer,
): LeaderboardMemberDto | null {
    const name = player.name.toLowerCase();
    return (
        members.find(
            (member) => member.removedAt === null && member.displayName.toLowerCase() === name,
        ) ?? null
    );
}

/**
 * Whether a board is this game's: everybody who played is on it. A board
 * without one of them is not where their game is kept, so it is not offered.
 */
export function boardFitsGame(
    members: readonly LeaderboardMemberDto[],
    players: readonly ToolPlayer[],
): boolean {
    return players.every((player) => memberForPlayer(members, player) !== null);
}
