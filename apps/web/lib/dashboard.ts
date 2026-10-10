import { LeaderboardPeriod, WIDGETS, WidgetType } from '@bzim/types';
import type { ActivityListingDto, WidgetSpec } from '@bzim/types';

/** The order the "add widget" sheet offers the types in. */
export const WIDGET_TYPES: readonly WidgetType[] = [
    WidgetType.UPCOMING,
    WidgetType.IDEAS,
    WidgetType.LEADERBOARD,
    WidgetType.NOTE,
    WidgetType.ACTIVITY,
    WidgetType.LINK,
];

/** A fresh config for the add dialog; ids start empty and must be picked. */
export function blankSpec(type: WidgetType): WidgetSpec {
    switch (type) {
        case WidgetType.UPCOMING:
            return { type, config: { weeks: WIDGETS.UPCOMING_WEEKS_DEFAULT } };
        case WidgetType.IDEAS:
            return { type, config: { limit: WIDGETS.LIMIT_DEFAULT } };
        case WidgetType.LEADERBOARD:
            return {
                type,
                config: { leaderboardId: '', period: LeaderboardPeriod.TOTAL, limit: 3 },
            };
        case WidgetType.NOTE:
            return { type, config: { title: '', body: '' } };
        case WidgetType.ACTIVITY:
            return { type, config: { activityId: '' } };
        case WidgetType.LINK:
            return { type, config: { label: '', url: '' } };
    }
}

export type WidgetProblem =
    | 'WEEKS_RANGE'
    | 'LIMIT_RANGE'
    | 'NO_LEADERBOARD'
    | 'NO_ACTIVITY'
    | 'NO_TITLE'
    | 'NO_LABEL'
    | 'BAD_URL';

/** Why the API would refuse this spec, or null. Mirrors `widgetSchemas` so Save is off for the same reasons. */
export function widgetProblem(spec: WidgetSpec): WidgetProblem | null {
    const inRange = (value: number, min: number, max: number) =>
        Number.isInteger(value) && value >= min && value <= max;
    switch (spec.type) {
        case WidgetType.UPCOMING:
            return inRange(
                spec.config.weeks,
                WIDGETS.UPCOMING_WEEKS_MIN,
                WIDGETS.UPCOMING_WEEKS_MAX,
            )
                ? null
                : 'WEEKS_RANGE';
        case WidgetType.IDEAS:
            return inRange(spec.config.limit, WIDGETS.LIMIT_MIN, WIDGETS.LIMIT_MAX)
                ? null
                : 'LIMIT_RANGE';
        case WidgetType.LEADERBOARD:
            if (spec.config.leaderboardId === '') return 'NO_LEADERBOARD';
            return inRange(spec.config.limit, WIDGETS.LIMIT_MIN, WIDGETS.LIMIT_MAX)
                ? null
                : 'LIMIT_RANGE';
        case WidgetType.NOTE:
            return spec.config.title.trim() === '' ? 'NO_TITLE' : null;
        case WidgetType.ACTIVITY:
            return spec.config.activityId === '' ? 'NO_ACTIVITY' : null;
        case WidgetType.LINK:
            if (spec.config.label.trim() === '') return 'NO_LABEL';
            return /^https?:\/\/\S+$/.test(spec.config.url.trim()) ? null : 'BAD_URL';
    }
}

/** The list with one item moved; the same list when the move goes nowhere. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
        return [...items];
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved !== undefined) next.splice(to, 0, moved);
    return next;
}

/** Ideas for the widget: the most wanted first, newest among equals. */
export function rankIdeas(activities: ActivityListingDto[], limit: number): ActivityListingDto[] {
    return [...activities]
        .sort((a, b) => b.interestCount - a.interestCount || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}
