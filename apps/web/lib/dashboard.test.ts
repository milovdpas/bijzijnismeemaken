import { describe, expect, it } from 'vitest';
import { LeaderboardPeriod, WidgetType } from '@bzim/types';
import type { ActivityListingDto } from '@bzim/types';

import { blankSpec, moveItem, rankIdeas, widgetProblem } from './dashboard';

describe('widgetProblem', () => {
    it('accepts every blank spec that needs no pick, and refuses the ones that do', () => {
        expect(widgetProblem(blankSpec(WidgetType.UPCOMING))).toBeNull();
        expect(widgetProblem(blankSpec(WidgetType.IDEAS))).toBeNull();
        expect(widgetProblem(blankSpec(WidgetType.LEADERBOARD))).toBe('NO_LEADERBOARD');
        expect(widgetProblem(blankSpec(WidgetType.ACTIVITY))).toBe('NO_ACTIVITY');
        expect(widgetProblem(blankSpec(WidgetType.NOTE))).toBe('NO_TITLE');
        expect(widgetProblem(blankSpec(WidgetType.LINK))).toBe('NO_LABEL');
    });

    it('mirrors the API ranges and the link rule', () => {
        expect(widgetProblem({ type: WidgetType.UPCOMING, config: { weeks: 13 } })).toBe(
            'WEEKS_RANGE',
        );
        expect(widgetProblem({ type: WidgetType.IDEAS, config: { limit: 0 } })).toBe('LIMIT_RANGE');
        expect(
            widgetProblem({
                type: WidgetType.LEADERBOARD,
                config: { leaderboardId: 'b1', period: LeaderboardPeriod.MONTHLY, limit: 3 },
            }),
        ).toBeNull();
        expect(
            widgetProblem({ type: WidgetType.LINK, config: { label: 'Album', url: 'ftp://x' } }),
        ).toBe('BAD_URL');
        expect(
            widgetProblem({
                type: WidgetType.LINK,
                config: { label: 'Album', url: 'https://photos.example/a' },
            }),
        ).toBeNull();
    });
});

describe('moveItem', () => {
    it('moves one item and leaves impossible moves alone', () => {
        expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
        expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
        expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
        expect(moveItem(['a', 'b', 'c'], 2, 3)).toEqual(['a', 'b', 'c']);
    });
});

describe('rankIdeas', () => {
    it('puts the most wanted first, newest among equals, and cuts at the limit', () => {
        const idea = (id: string, interestCount: number, createdAt: string) =>
            ({ id, interestCount, createdAt }) as ActivityListingDto;
        const ranked = rankIdeas(
            [
                idea('old', 2, '2026-01-01'),
                idea('new', 2, '2026-02-01'),
                idea('top', 5, '2025-01-01'),
            ],
            2,
        );
        expect(ranked.map((item) => item.id)).toEqual(['top', 'new']);
    });
});
