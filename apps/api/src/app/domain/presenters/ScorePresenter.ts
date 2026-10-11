import type { ScoreEntryDto, ScoreHistoryDto } from '@bzim/types';

import type LeaderboardMember from '../models/LeaderboardMember.entity';
import type LeaderboardScoreHistory from '../models/LeaderboardScoreHistory.entity';

/** A score row of any period table, as the presenter needs it. */
interface ScoreRow {
    member: LeaderboardMember;
    score: number;
    updatedAt: Date;
}

/** Score rows and history rows as the API answers them. Needs `member.user` (and `changedBy`) loaded. */
export default class ScorePresenter {
    static entry(rank: number, row: ScoreRow): ScoreEntryDto {
        return {
            rank,
            member: row.member.toDto(),
            score: row.score,
            updatedAt: row.updatedAt.toISOString(),
        };
    }

    static history(row: LeaderboardScoreHistory): ScoreHistoryDto {
        const changedBy = row.changedBy?.toSummary() ?? null;
        return {
            id: row.id,
            member: row.member.toDto(),
            changedBy,
            changedByName: changedBy?.displayName ?? row.changedByNameSnapshot,
            oldScore: row.oldScore,
            newScore: row.newScore,
            year: row.year,
            month: row.month,
            createdAt: row.createdAt.toISOString(),
        };
    }
}
