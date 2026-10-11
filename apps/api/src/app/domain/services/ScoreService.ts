import { DateTime } from 'luxon';
import type { EntityManager } from 'typeorm';
import { TIME_ZONE } from '@bzim/types';

import { AppDataSource } from '../../../database/typeorm-db';
import type Leaderboard from '../models/Leaderboard.entity';
import type LeaderboardMember from '../models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../models/LeaderboardScoreYearly.entity';
import type User from '../models/User.entity';

/** The period a write lands in: always now, in the app's zone. Past months are read-only by decision. */
export interface CurrentPeriod {
    year: number;
    month: number;
}

/**
 * Writing scores (docs/03 "Score write semantics"). One entry is an absolute
 * value that becomes the current month's, the current year's and the
 * all-time value at once, so each ranking is one indexed read. A value equal
 * to all three is a no-op, so an idle re-save never moves the tie-break.
 */
export class ScoreService {
    static currentPeriod(): CurrentPeriod {
        const now = DateTime.now().setZone(TIME_ZONE);
        return { year: now.year, month: now.month };
    }

    /** Sets the three rows and writes history. Returns false when nothing changed. */
    static async set(
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
        score: number,
    ): Promise<boolean> {
        const { year, month } = ScoreService.currentPeriod();
        return AppDataSource.transaction(async (manager) => {
            const [monthly, yearly, total] = await ScoreService.rows(manager, member, year, month);
            if (monthly?.score === score && yearly?.score === score && total?.score === score) {
                return false;
            }
            await manager.save(
                monthly === null
                    ? manager.create(LeaderboardScoreMonthly, {
                          leaderboardId: leaderboard.id,
                          memberId: member.id,
                          year,
                          month,
                          score,
                          updatedById: actor.id,
                      })
                    : Object.assign(monthly, { score, updatedById: actor.id }),
            );
            await manager.save(
                yearly === null
                    ? manager.create(LeaderboardScoreYearly, {
                          leaderboardId: leaderboard.id,
                          memberId: member.id,
                          year,
                          score,
                          updatedById: actor.id,
                      })
                    : Object.assign(yearly, { score, updatedById: actor.id }),
            );
            await manager.save(
                total === null
                    ? manager.create(LeaderboardScoreTotal, {
                          leaderboardId: leaderboard.id,
                          memberId: member.id,
                          score,
                          updatedById: actor.id,
                      })
                    : Object.assign(total, { score, updatedById: actor.id }),
            );
            await manager.save(
                ScoreService.historyRow(
                    manager,
                    leaderboard,
                    member,
                    actor,
                    total?.score ?? null,
                    score,
                    year,
                    month,
                ),
            );
            return true;
        });
    }

    /** Clears the current period and the all-time value; history records the clearing. */
    static async clear(
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
    ): Promise<boolean> {
        const { year, month } = ScoreService.currentPeriod();
        return AppDataSource.transaction(async (manager) => {
            const [monthly, yearly, total] = await ScoreService.rows(manager, member, year, month);
            if (monthly === null && yearly === null && total === null) {
                return false;
            }
            if (monthly !== null) await manager.remove(monthly);
            if (yearly !== null) await manager.remove(yearly);
            if (total !== null) await manager.remove(total);
            await manager.save(
                ScoreService.historyRow(
                    manager,
                    leaderboard,
                    member,
                    actor,
                    total?.score ?? null,
                    null,
                    year,
                    month,
                ),
            );
            return true;
        });
    }

    private static rows(
        manager: EntityManager,
        member: LeaderboardMember,
        year: number,
        month: number,
    ): Promise<
        [
            LeaderboardScoreMonthly | null,
            LeaderboardScoreYearly | null,
            LeaderboardScoreTotal | null,
        ]
    > {
        return Promise.all([
            manager.findOneBy(LeaderboardScoreMonthly, { memberId: member.id, year, month }),
            manager.findOneBy(LeaderboardScoreYearly, { memberId: member.id, year }),
            manager.findOneBy(LeaderboardScoreTotal, { memberId: member.id }),
        ]);
    }

    private static historyRow(
        manager: EntityManager,
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
        oldScore: number | null,
        newScore: number | null,
        year: number,
        month: number,
    ): LeaderboardScoreHistory {
        return manager.create(LeaderboardScoreHistory, {
            leaderboardId: leaderboard.id,
            memberId: member.id,
            changedById: actor.id,
            changedByNameSnapshot: actor.displayName ?? actor.handle ?? '',
            oldScore,
            newScore,
            year,
            month,
        });
    }
}
