import { DateTime } from 'luxon';
import type { EntityManager } from 'typeorm';
import { LEADERBOARD, ScoreType, TIME_ZONE } from '@bzim/types';

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

export type StepResult = { ok: true } | { ok: false; problem: 'TIME_BOARD' };

/** The member's rows for this month, this year and all time, each null while it has no value. */
type ScoreRows = [
    LeaderboardScoreMonthly | null,
    LeaderboardScoreYearly | null,
    LeaderboardScoreTotal | null,
];

/** The values to write in the same order; null leaves that period without a row. */
type ScoreValues = [number | null, number | null, number | null];

/**
 * Writing scores (docs/03 "Score write semantics"). One entry is an absolute
 * value that becomes the current month's, the current year's and the
 * all-time value at once, so each ranking is one indexed read. A step adds
 * one to each of the three instead, so a running count stays right per
 * period. A write that changes nothing is a no-op, so an idle re-save never
 * moves the tie-break.
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
        return AppDataSource.transaction(async (manager) =>
            ScoreService.write(
                manager,
                leaderboard,
                member,
                actor,
                year,
                month,
                await ScoreService.rows(manager, member, year, month),
                [score, score, score],
            ),
        );
    }

    /**
     * One up or down in each of the three values: the plus and minus
     * buttons, and a game posted from a tool. A win then counts in this
     * month, this year and all time alike, where `set` would make the three
     * equal. No value drops below zero, and a period without a value gets
     * none from a step down. Only for points; a time has no step of one.
     */
    static async step(
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
        delta: 1 | -1,
    ): Promise<StepResult> {
        if (leaderboard.scoreType !== ScoreType.NUMBER) {
            return { ok: false, problem: 'TIME_BOARD' };
        }
        const { year, month } = ScoreService.currentPeriod();
        await AppDataSource.transaction(async (manager) => {
            const rows = await ScoreService.rows(manager, member, year, month);
            const [monthly, yearly, total] = rows.map((row) => {
                if (row === null) return delta > 0 ? delta : null;
                const stepped = Number((row.score + delta).toFixed(LEADERBOARD.SCORE_DECIMALS));
                return Math.min(LEADERBOARD.SCORE_MAX, Math.max(0, stepped));
            });
            await ScoreService.write(manager, leaderboard, member, actor, year, month, rows, [
                monthly ?? null,
                yearly ?? null,
                total ?? null,
            ]);
        });
        return { ok: true };
    }

    /**
     * Writes the values over the member's rows, creating rows as needed, and
     * one history row with the all-time change. Returns false when nothing
     * differed, without touching a row.
     */
    private static async write(
        manager: EntityManager,
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
        year: number,
        month: number,
        [monthly, yearly, total]: ScoreRows,
        [monthlyScore, yearlyScore, totalScore]: ScoreValues,
    ): Promise<boolean> {
        if (
            (monthly?.score ?? null) === monthlyScore &&
            (yearly?.score ?? null) === yearlyScore &&
            (total?.score ?? null) === totalScore
        ) {
            return false;
        }
        // Read before the saves below write the new value into the same object.
        const oldTotal = total?.score ?? null;
        const by = { leaderboardId: leaderboard.id, memberId: member.id, updatedById: actor.id };
        if (monthlyScore !== null) {
            await manager.save(
                monthly === null
                    ? manager.create(LeaderboardScoreMonthly, {
                          ...by,
                          year,
                          month,
                          score: monthlyScore,
                      })
                    : Object.assign(monthly, { score: monthlyScore, updatedById: actor.id }),
            );
        }
        if (yearlyScore !== null) {
            await manager.save(
                yearly === null
                    ? manager.create(LeaderboardScoreYearly, { ...by, year, score: yearlyScore })
                    : Object.assign(yearly, { score: yearlyScore, updatedById: actor.id }),
            );
        }
        if (totalScore !== null) {
            await manager.save(
                total === null
                    ? manager.create(LeaderboardScoreTotal, { ...by, score: totalScore })
                    : Object.assign(total, { score: totalScore, updatedById: actor.id }),
            );
        }
        await manager.save(
            ScoreService.historyRow(
                manager,
                leaderboard,
                member,
                actor,
                oldTotal,
                totalScore,
                year,
                month,
            ),
        );
        return true;
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
    ): Promise<ScoreRows> {
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
