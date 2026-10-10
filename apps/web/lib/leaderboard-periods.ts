import { DateTime } from 'luxon';
import { LeaderboardPeriod, TIME_ZONE } from '@bzim/types';
import type { PeriodsResponse } from '@bzim/types';

import type { ScoreScope } from './api/leaderboards';

/** The periods a board keeps, in the order the tabs show them: month, year, all time. */
export function enabledPeriods(board: {
    showMonthly: boolean;
    showYearly: boolean;
    showAllTime: boolean;
}): LeaderboardPeriod[] {
    const periods: LeaderboardPeriod[] = [];
    if (board.showMonthly) periods.push(LeaderboardPeriod.MONTHLY);
    if (board.showYearly) periods.push(LeaderboardPeriod.YEARLY);
    if (board.showAllTime) periods.push(LeaderboardPeriod.TOTAL);
    return periods;
}

/** Now, in the app's zone, as the year and month a score lands in. */
export function currentPeriod(): { year: number; month: number } {
    const now = DateTime.now().setZone(TIME_ZONE);
    return { year: now.year, month: now.month };
}

export interface PeriodChoice {
    /** `2026-10` for a month, `2026` for a year; what the picker holds. */
    value: string;
    year: number;
    month: number | null;
}

/**
 * What the month or year picker offers: every period that holds scores,
 * newest first, with the current one always present so a first score can
 * be entered. Nothing for the all-time ranking.
 */
export function periodChoices(
    period: LeaderboardPeriod,
    available: PeriodsResponse | undefined,
    now: { year: number; month: number },
): PeriodChoice[] {
    if (period === LeaderboardPeriod.TOTAL) return [];
    if (period === LeaderboardPeriod.YEARLY) {
        const years = [...new Set([now.year, ...(available?.years ?? [])])].sort((a, b) => b - a);
        return years.map((year) => ({ value: String(year), year, month: null }));
    }
    const months = [{ year: now.year, month: now.month }, ...(available?.months ?? [])];
    const seen = new Set<string>();
    return months
        .filter((entry) => {
            const key = `${String(entry.year)}-${String(entry.month)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => b.year - a.year || b.month - a.month)
        .map((entry) => ({
            value: `${String(entry.year)}-${String(entry.month)}`,
            year: entry.year,
            month: entry.month,
        }));
}

/** The scope of a ranking: the year only where the period cares, the month only for a month. */
export function scopeFor(period: LeaderboardPeriod, year: number, month: number): ScoreScope {
    return {
        period,
        year: period === LeaderboardPeriod.TOTAL ? undefined : year,
        month: period === LeaderboardPeriod.MONTHLY ? month : undefined,
    };
}
