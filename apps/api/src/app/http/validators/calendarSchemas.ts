import { z } from 'zod';
import { CALENDAR_FEED, CalendarIgnoreRuleKind } from '@bzim/types';

export const calendarConnectQuerySchema = z.object({
    scope: z.enum(['read', 'readwrite']).default('read'),
    /** Where to land afterwards instead of the calendar settings; a path, checked like the login one. */
    returnTo: z.string().max(255).optional(),
});

/** What Google sends back: the state always, then either a code or an error. */
export const calendarCallbackQuerySchema = z.object({
    state: z.string().min(1).max(64),
    code: z.string().min(1).optional(),
    error: z.string().optional(),
});

export const calendarSourceParamSchema = z.object({
    sourceId: z.uuid(),
});

export const updateCalendarSourceSchema = z.object({
    enabled: z.boolean(),
});

export const ignoreRuleSchema = z.object({
    kind: z.enum(CalendarIgnoreRuleKind),
    value: z.string().trim().min(1).max(255),
    label: z.string().trim().min(1).max(255),
});

export const ignoreRuleParamSchema = z.object({
    ruleId: z.uuid(),
});

/** A calendar link as pasted; whether it can be read is the service's to find out. */
export const addCalendarFeedSchema = z.object({
    url: z.string().trim().min(1).max(CALENDAR_FEED.URL_MAX_LENGTH),
    name: z.string().trim().max(CALENDAR_FEED.NAME_MAX_LENGTH).optional(),
});

export const calendarFeedParamSchema = z.object({
    feedId: z.uuid(),
});
