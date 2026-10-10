import { LeaderboardPeriod } from '@bzim/types';

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
