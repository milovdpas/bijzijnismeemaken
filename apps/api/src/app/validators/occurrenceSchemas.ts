import { DateTime } from 'luxon';
import { z } from 'zod';
import { ACTIVITY, AVAILABILITY, Daypart, OccurrenceStatus, TIME_ZONE } from '@bzim/types';

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

/** `from..to`, inclusive, at most `AVAILABILITY.MAX_RANGE_DAYS` apart. */
export const rangeQuerySchema = z
    .object({
        from: z.iso.date(),
        to: z.iso.date(),
    })
    .refine((range) => range.from <= range.to, { message: 'from must not be after to' })
    .refine(
        (range) =>
            DateTime.fromISO(range.to, { zone: TIME_ZONE }).diff(
                DateTime.fromISO(range.from, { zone: TIME_ZONE }),
                'days',
            ).days < AVAILABILITY.MAX_RANGE_DAYS,
        { message: `At most ${String(AVAILABILITY.MAX_RANGE_DAYS)} days` },
    );

export const icsQuerySchema = z.object({
    token: z.string().min(1).max(128),
});
