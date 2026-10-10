import { describe, expect, it } from 'vitest';
import { LeaderboardPeriod } from '@bzim/types';

import { enabledPeriods, periodChoices, scopeFor } from './leaderboard-periods';

const NOW = { year: 2026, month: 10 };

describe('enabledPeriods', () => {
    it('lists the shown periods in tab order', () => {
        expect(enabledPeriods({ showMonthly: true, showYearly: false, showAllTime: true })).toEqual(
            [LeaderboardPeriod.MONTHLY, LeaderboardPeriod.TOTAL],
        );
    });
});

describe('periodChoices', () => {
    it('offers nothing for all time', () => {
        expect(periodChoices(LeaderboardPeriod.TOTAL, undefined, NOW)).toEqual([]);
    });

    it('always offers the current year and month, newest first, without doubles', () => {
        expect(periodChoices(LeaderboardPeriod.YEARLY, undefined, NOW)).toEqual([
            { value: '2026', year: 2026, month: null },
        ]);
        expect(
            periodChoices(LeaderboardPeriod.YEARLY, { years: [2026, 2024], months: [] }, NOW).map(
                (choice) => choice.year,
            ),
        ).toEqual([2026, 2024]);
        expect(
            periodChoices(
                LeaderboardPeriod.MONTHLY,
                {
                    years: [],
                    months: [
                        { year: 2026, month: 10 },
                        { year: 2026, month: 8 },
                        { year: 2025, month: 12 },
                    ],
                },
                NOW,
            ).map((choice) => choice.value),
        ).toEqual(['2026-10', '2026-8', '2025-12']);
    });
});

describe('scopeFor', () => {
    it('keeps only the parts of the date the period cares about', () => {
        expect(scopeFor(LeaderboardPeriod.MONTHLY, 2026, 10)).toEqual({
            period: LeaderboardPeriod.MONTHLY,
            year: 2026,
            month: 10,
        });
        expect(scopeFor(LeaderboardPeriod.YEARLY, 2026, 10)).toEqual({
            period: LeaderboardPeriod.YEARLY,
            year: 2026,
            month: undefined,
        });
        expect(scopeFor(LeaderboardPeriod.TOTAL, 2026, 10)).toEqual({
            period: LeaderboardPeriod.TOTAL,
            year: undefined,
            month: undefined,
        });
    });
});
