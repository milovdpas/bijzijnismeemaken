import { z } from 'zod';
import { ACTIVITY, Daypart, OccurrenceStatus } from '@bzim/types';

export const occurrenceParamSchema = z.object({
    groupId: z.uuid(),
    activityId: z.uuid(),
    occurrenceId: z.uuid(),
});

export const occurrenceIdParamSchema = z.object({
    occurrenceId: z.uuid(),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
const notes = z
    .string()
    .trim()
    .max(ACTIVITY.NOTES_MAX_LENGTH)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const planOccurrenceSchema = z.object({
    date: z.iso.date(),
    daypart: z.enum(Daypart).nullable().optional(),
    startTime: time.nullable().optional(),
    notes: notes.optional(),
    /** Empty is allowed: an occurrence can be put on the agenda before anyone is picked. */
    participantIds: z.array(z.uuid()).max(ACTIVITY.PEOPLE_MAX),
});

export const updateOccurrenceSchema = planOccurrenceSchema
    .extend({ status: z.enum(OccurrenceStatus) })
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

export const icsQuerySchema = z.object({
    token: z.string().min(1).max(128),
});
