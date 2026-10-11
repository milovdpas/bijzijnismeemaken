import { z } from 'zod';
import { LeaderboardPeriod, WIDGETS, WidgetType } from '@bzim/types';

/** One schema per widget type; the config a type carries and nothing else. */
const upcomingConfig = z.object({
    weeks: z.number().int().min(WIDGETS.UPCOMING_WEEKS_MIN).max(WIDGETS.UPCOMING_WEEKS_MAX),
});
const ideasConfig = z.object({
    limit: z.number().int().min(WIDGETS.LIMIT_MIN).max(WIDGETS.LIMIT_MAX),
});
const leaderboardConfig = z.object({
    leaderboardId: z.uuid(),
    period: z.enum(LeaderboardPeriod),
    limit: z.number().int().min(WIDGETS.LIMIT_MIN).max(WIDGETS.LIMIT_MAX),
});
const noteConfig = z.object({
    title: z.string().trim().min(1).max(WIDGETS.NOTE_TITLE_MAX_LENGTH),
    body: z.string().trim().max(WIDGETS.NOTE_BODY_MAX_LENGTH),
});
const activityConfig = z.object({
    activityId: z.uuid(),
});
const linkConfig = z.object({
    label: z.string().trim().min(1).max(WIDGETS.LINK_LABEL_MAX_LENGTH),
    url: z.url({ protocol: /^https?$/ }).max(WIDGETS.URL_MAX_LENGTH),
});

/** A widget as it is added: its type decides which config is valid. */
export const widgetSpecSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal(WidgetType.UPCOMING), config: upcomingConfig }),
    z.object({ type: z.literal(WidgetType.IDEAS), config: ideasConfig }),
    z.object({ type: z.literal(WidgetType.LEADERBOARD), config: leaderboardConfig }),
    z.object({ type: z.literal(WidgetType.NOTE), config: noteConfig }),
    z.object({ type: z.literal(WidgetType.ACTIVITY), config: activityConfig }),
    z.object({ type: z.literal(WidgetType.LINK), config: linkConfig }),
]);

export const addWidgetSchema = widgetSpecSchema;

/** The config of an existing widget; checked against its stored type once that is loaded. */
export const updateWidgetSchema = z.object({
    config: z.record(z.string(), z.unknown()),
});

export const reorderWidgetsSchema = z.object({
    widgetIds: z.array(z.uuid()).min(1).max(WIDGETS.MAX_PER_GROUP),
});

export const widgetParamSchema = z.object({
    groupId: z.uuid(),
    widgetId: z.uuid(),
});
