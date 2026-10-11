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

/** The year and month a ranking is about; null where the period does not care. */
interface ResolvedPeriod {
    year: number | null;
    month: number | null;
}

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
        const resolved = ScoreQueryService.resolve(period, year, month);
        const size = Math.min(Math.max(pageSize, 1), PAGINATION.MAX_PAGE_SIZE);
        const offset = (Math.max(page, 1) - 1) * size;
        const scoped = () => ScoreQueryService.scoped(leaderboard, period, resolved);

        const [rows, count, mine] = await Promise.all([
            offset >= LEADERBOARD.RANK_LIMIT
                ? Promise.resolve([])
                : ScoreQueryService.ranked(scoped(), leaderboard)
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
            me: mine === null ? null : await ScoreQueryService.myRank(scoped(), mine, leaderboard),
        };
    }

    /** The head of the board's card ranking (its `cardPeriod`, now), for the list. */
    static async top(leaderboard: Leaderboard, limit: number): Promise<ScoreEntryDto[]> {
        const period = leaderboard.cardPeriod;
        const rows = await ScoreQueryService.ranked(
            ScoreQueryService.scoped(
                leaderboard,
                period,
                ScoreQueryService.resolve(period, undefined, undefined),
            ),
            leaderboard,
        )
            .take(limit)
            .getMany();
        return rows.map((row, index) => ScorePresenter.entry(index + 1, row));
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

    /** Absent year and month mean now, in the app's zone. */
    private static resolve(
        period: LeaderboardPeriod,
        year: number | undefined,
        month: number | undefined,
    ): ResolvedPeriod {
        const current = ScoreService.currentPeriod();
        return {
            year: period === LeaderboardPeriod.TOTAL ? null : (year ?? current.year),
            month: period === LeaderboardPeriod.MONTHLY ? (month ?? current.month) : null,
        };
    }

    /** The rows of this board and period, nothing joined yet. */
    private static scoped(
        leaderboard: Leaderboard,
        period: LeaderboardPeriod,
        resolved: ResolvedPeriod,
    ): SelectQueryBuilder<ScoreRow> {
        const query = ScoreQueryService.table(period)
            .createQueryBuilder('s')
            .where('s.leaderboard_id = :leaderboardId', { leaderboardId: leaderboard.id });
        if (resolved.year !== null) query.andWhere('s.year = :year', { year: resolved.year });
        if (resolved.month !== null) query.andWhere('s.month = :month', { month: resolved.month });
        return query;
    }

    /** The ranking order, with the people on it loaded for the presenter. */
    private static ranked(
        query: SelectQueryBuilder<ScoreRow>,
        leaderboard: Leaderboard,
    ): SelectQueryBuilder<ScoreRow> {
        return query
            .innerJoinAndSelect('s.member', 'member')
            .leftJoinAndSelect('member.user', 'user')
            .orderBy('s.score', leaderboard.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC')
            .addOrderBy('s.updatedAt', 'ASC')
            .addOrderBy('s.id', 'ASC');
    }

    /**
     * Rank = rows that order before mine, plus one. The scan stops at
     * `RANK_LIMIT` rows (a LIMIT on the index range), so a long tail costs
     * the same as the top, and a rank below the limit is "500+".
     */
    private static async myRank(
        scoped: SelectQueryBuilder<ScoreRow>,
        mine: ScoreRow,
        leaderboard: Leaderboard,
    ): Promise<MyScoreDto> {
        const better =
            leaderboard.sortOrder === SortOrder.ASC ? 's.score < :score' : 's.score > :score';
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
