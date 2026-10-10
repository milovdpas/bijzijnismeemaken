import { LEADERBOARD, LeaderboardPeriod, PAGINATION, SortOrder } from '@bzim/types';
import type {
    MyScoreDto,
    PeriodsResponse,
    ScoreEntryDto,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';
import type { SelectQueryBuilder } from 'typeorm';

import type Leaderboard from '../models/Leaderboard.entity';
import LeaderboardScoreHistory from '../models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../models/LeaderboardScoreYearly.entity';
import ScorePresenter from '../presenters/ScorePresenter';
import { ScoreService } from './ScoreService';

type ScoreRow = LeaderboardScoreMonthly | LeaderboardScoreYearly | LeaderboardScoreTotal;

/**
 * Reading rankings. One period table at a time, ordered by score the way
 * the board wants, then by `updated_at` and id so the first to reach a value
 * ranks above the next: the list and a person's rank use the same order, so
 * they always agree. Nothing is counted past `RANK_LIMIT`: the list stops
 * there and a rank below it is reported as "500+". Removed members
 * are not on a ranking; their score rows went with their removal.
 */
export class ScoreQueryService {
    static async page(
        leaderboard: Leaderboard,
        period: LeaderboardPeriod,
        year: number | undefined,
        month: number | undefined,
        page: number,
        pageSize: number,
        viewerUserId: string,
    ): Promise<ScoresResponse> {
        const current = ScoreService.currentPeriod();
        const resolved = {
            year: period === LeaderboardPeriod.TOTAL ? null : (year ?? current.year),
            month: period === LeaderboardPeriod.MONTHLY ? (month ?? current.month) : null,
        };
        const size = Math.min(Math.max(pageSize, 1), PAGINATION.MAX_PAGE_SIZE);
        const offset = (Math.max(page, 1) - 1) * size;
        const direction = leaderboard.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

        /** The rows of this board and period, nothing joined yet. */
        const scoped = (): SelectQueryBuilder<ScoreRow> => {
            const query = ScoreQueryService.table(period)
                .createQueryBuilder('s')
                .where('s.leaderboard_id = :leaderboardId', { leaderboardId: leaderboard.id });
            if (resolved.year !== null) query.andWhere('s.year = :year', { year: resolved.year });
            if (resolved.month !== null)
                query.andWhere('s.month = :month', { month: resolved.month });
            return query;
        };

        const [rows, count, mine] = await Promise.all([
            offset >= LEADERBOARD.RANK_LIMIT
                ? Promise.resolve([])
                : scoped()
                      .innerJoinAndSelect('s.member', 'member')
                      .leftJoinAndSelect('member.user', 'user')
                      .orderBy('s.score', direction)
                      .addOrderBy('s.updatedAt', 'ASC')
                      .addOrderBy('s.id', 'ASC')
                      .skip(offset)
                      .take(Math.min(size, LEADERBOARD.RANK_LIMIT - offset))
                      .getMany(),
            scoped().getCount(),
            scoped()
                .innerJoin('s.member', 'member')
                .andWhere('member.user_id = :viewerUserId', { viewerUserId })
                .getOne(),
        ]);
        const total = Math.min(count, LEADERBOARD.RANK_LIMIT);
        const items: ScoreEntryDto[] = rows.map((row, index) =>
            ScorePresenter.entry(offset + index + 1, row),
        );

        return {
            items,
            page: Math.max(page, 1),
            pageSize: size,
            total,
            hasMore: offset + items.length < total,
            period,
            year: resolved.year,
            month: resolved.month,
            me: mine === null ? null : await ScoreQueryService.myRank(scoped(), mine, direction),
        };
    }

    /** Which months and years hold scores, newest first, for the pickers. */
    static async periods(leaderboard: Leaderboard): Promise<PeriodsResponse> {
        const [months, years] = await Promise.all([
            LeaderboardScoreMonthly.createQueryBuilder('s')
                .select('s.year', 'year')
                .addSelect('s.month', 'month')
                .where('s.leaderboard_id = :id', { id: leaderboard.id })
                .groupBy('s.year')
                .addGroupBy('s.month')
                .orderBy('s.year', 'DESC')
                .addOrderBy('s.month', 'DESC')
                .getRawMany<{ year: number; month: number }>(),
            LeaderboardScoreYearly.createQueryBuilder('s')
                .select('s.year', 'year')
                .where('s.leaderboard_id = :id', { id: leaderboard.id })
                .groupBy('s.year')
                .orderBy('s.year', 'DESC')
                .getRawMany<{ year: number }>(),
        ]);
        return {
            months: months.map((row) => ({ year: Number(row.year), month: Number(row.month) })),
            years: years.map((row) => Number(row.year)),
        };
    }

    /** Newest change first. */
    static async history(
        leaderboard: Leaderboard,
        page: number,
        pageSize: number,
    ): Promise<{ items: ScoreHistoryDto[]; total: number }> {
        const size = Math.min(Math.max(pageSize, 1), PAGINATION.MAX_PAGE_SIZE);
        const [rows, total] = await LeaderboardScoreHistory.findAndCount({
            where: { leaderboardId: leaderboard.id },
            relations: { member: { user: true }, changedBy: true },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (Math.max(page, 1) - 1) * size,
            take: size,
        });
        return { items: rows.map((row) => ScorePresenter.history(row)), total };
    }

    /**
     * Rank = rows that order before mine, plus one. The scan stops at
     * `RANK_LIMIT` rows (a LIMIT on the index range), so a long tail costs
     * the same as the top, and a rank below the limit is "500+".
     */
    private static async myRank(
        scoped: SelectQueryBuilder<ScoreRow>,
        mine: ScoreRow,
        direction: 'ASC' | 'DESC',
    ): Promise<MyScoreDto> {
        const better = direction === 'DESC' ? 's.score > :score' : 's.score < :score';
        const ahead = await scoped
            .select('s.id')
            .andWhere(
                `(${better} OR (s.score = :score AND (s.updated_at < :updatedAt OR (s.updated_at = :updatedAt AND s.id < :id))))`,
                { score: mine.score, updatedAt: mine.updatedAt, id: mine.id },
            )
            .limit(LEADERBOARD.RANK_LIMIT)
            .getRawMany();
        return {
            rank:
                ahead.length < LEADERBOARD.RANK_LIMIT
                    ? String(ahead.length + 1)
                    : `${String(LEADERBOARD.RANK_LIMIT)}+`,
            score: mine.score,
        };
    }

    private static table(
        period: LeaderboardPeriod,
    ):
        | typeof LeaderboardScoreMonthly
        | typeof LeaderboardScoreYearly
        | typeof LeaderboardScoreTotal {
        switch (period) {
            case LeaderboardPeriod.MONTHLY:
                return LeaderboardScoreMonthly;
            case LeaderboardPeriod.YEARLY:
                return LeaderboardScoreYearly;
            case LeaderboardPeriod.TOTAL:
                return LeaderboardScoreTotal;
        }
    }
}
