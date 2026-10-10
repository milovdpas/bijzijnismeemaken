import type {
    LeaderboardDetailDto,
    LeaderboardListingDto,
    ScoreEntryDto,
    UserSummary,
} from '@bzim/types';

import type Leaderboard from '../models/Leaderboard.entity';

/** What the viewer may do with a board; the service decides, the presenter only shows. */
export interface LeaderboardPermissions {
    canManage: boolean;
    canEditScores: boolean;
}

/**
 * A board plus what the viewer may do with it. Needs `createdBy`,
 * `editors.user` and `members.user` loaded.
 */
export default class LeaderboardPresenter {
    static listing(
        leaderboard: Leaderboard,
        permissions: LeaderboardPermissions,
        top: ScoreEntryDto[],
    ): LeaderboardListingDto {
        return {
            ...leaderboard.toDto(),
            memberCount: leaderboard.members.filter((member) => member.isActive()).length,
            top,
            ...permissions,
        };
    }

    /** Active members first, by name; removed ones after, so history stays reachable. */
    static detail(
        leaderboard: Leaderboard,
        permissions: LeaderboardPermissions,
        top: ScoreEntryDto[],
    ): LeaderboardDetailDto {
        const members = leaderboard.members.map((member) => member.toDto());
        members.sort(
            (a, b) =>
                Number(a.removedAt !== null) - Number(b.removedAt !== null) ||
                a.displayName.localeCompare(b.displayName),
        );
        return {
            ...LeaderboardPresenter.listing(leaderboard, permissions, top),
            members,
            editors: leaderboard.editors.flatMap((editor) => {
                const summary: UserSummary | null = editor.user.toSummary();
                return summary === null ? [] : [summary];
            }),
        };
    }
}
