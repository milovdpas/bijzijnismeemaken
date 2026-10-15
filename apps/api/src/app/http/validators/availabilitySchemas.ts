import { z } from 'zod';
import { Daypart } from '@bzim/types';

import { rangeQuerySchema } from './commonSchemas';

const weekday = z.literal([1, 2, 3, 4, 5, 6, 7]);

/** `PUT` and `DELETE /me/unavailability` carry the same block; `free` only counts on `PUT`. */
export const unavailabilitySchema = z.object({
    date: z.iso.date(),
    daypart: z.enum(Daypart),
    free: z.boolean().default(false),
});

const ruleFields = z.object({
    weekday,
    daypart: z.enum(Daypart),
    validFrom: z.iso.date().nullable().optional(),
    validUntil: z.iso.date().nullable().optional(),
});

const rangeInOrder = (rule: { validFrom?: string | null; validUntil?: string | null }) =>
    rule.validFrom == null || rule.validUntil == null || rule.validFrom <= rule.validUntil;

export const createRuleSchema = ruleFields.refine(rangeInOrder, {
    message: 'validFrom must not be after validUntil',
});

export const updateRuleSchema = ruleFields
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required')
    .refine(rangeInOrder, { message: 'validFrom must not be after validUntil' });

export const ruleIdParamSchema = z.object({
    ruleId: z.uuid(),
});

/** The group matrix: a range, optionally narrowed to the people in for one activity. */
export const groupAvailabilityQuerySchema = rangeQuerySchema.safeExtend({
    activityId: z.uuid().optional(),
});
