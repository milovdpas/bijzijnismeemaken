import { z } from 'zod';
import {
    ACTIVITY,
    AVAILABILITY,
    ActivityCategory,
    ActivityLabel,
    DateMode,
    Daypart,
} from '@bzim/types';

export const activityParamSchema = z.object({
    groupId: z.uuid(),
    activityId: z.uuid(),
});

export const interestOfParamSchema = activityParamSchema.extend({
    userId: z.uuid(),
});

/** Optional text: empty and whitespace-only become null, so "nothing" has one spelling. */
const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .nullable()
        .transform((value) => (value === '' ? null : value));

const optionalUrl = z.url().max(ACTIVITY.URL_MAX_LENGTH).nullable();
const optionalTime = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm')
    .nullable();
const optionalPeople = z.number().int().min(1).max(ACTIVITY.PEOPLE_MAX).nullable();
/** ISO weekday, Monday 1 to Sunday 7; the literals are assignable to the `Weekday` enum. */
const weekday = z.literal([1, 2, 3, 4, 5, 6, 7]);

/**
 * Every field of an activity. The cross-field rules (date mode versus date
 * and weekday, recurring, min/max) are not here: `activityRuleProblem` in
 * `@bzim/types` judges them in the service, so a PATCH is judged on the
 * merged result rather than on the patch alone.
 */
const activityFields = z.object({
    category: z.enum(ActivityCategory),
    title: z.string().trim().min(ACTIVITY.TITLE_MIN_LENGTH).max(ACTIVITY.TITLE_MAX_LENGTH),
    description: optionalText(ACTIVITY.DESCRIPTION_MAX_LENGTH).optional(),
    imageUrl: optionalUrl.optional(),
    imageCreditName: optionalText(80).optional(),
    imageCreditUrl: optionalUrl.optional(),
    isRecurring: z.boolean(),
    dateMode: z.enum(DateMode),
    specificDate: z.iso.date().nullable().optional(),
    weekday: weekday.nullable().optional(),
    startTime: optionalTime.optional(),
    locationText: optionalText(ACTIVITY.LOCATION_MAX_LENGTH).optional(),
    locationUrl: optionalUrl.optional(),
    minPeople: optionalPeople.optional(),
    maxPeople: optionalPeople.optional(),
    costPerPerson: z.number().min(0).max(999999.99).nullable().optional(),
    durationMinutes: z
        .number()
        .int()
        .min(5)
        .max(ACTIVITY.DURATION_MAX_MINUTES)
        .nullable()
        .optional(),
    externalUrl: optionalUrl.optional(),
    preferredDayparts: z.array(z.enum(Daypart)).min(1).max(3).nullable().optional(),
});

export const createActivitySchema = activityFields;

export const updateActivitySchema = activityFields
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

/** Query strings carry booleans as words. */
const boolWord = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listActivitiesQuerySchema = z.object({
    label: z.enum(ActivityLabel).optional(),
    recurring: boolWord.optional(),
    weekday: z.coerce.number().pipe(weekday).optional(),
    includeInactive: boolWord.optional(),
    sort: z.enum(['next', 'newest']).default('newest'),
});

/** Query strings carry lists comma-separated. */
const uuidList = z
    .string()
    .transform((value) => value.split(',').filter((part) => part !== ''))
    .pipe(z.array(z.uuid()).max(ACTIVITY.PEOPLE_MAX));

export const suggestionsQuerySchema = z.object({
    /** Defaults to the people who are in. */
    memberIds: uuidList.optional(),
    /** Defaults to today. */
    from: z.iso.date().optional(),
    weeks: z.coerce
        .number()
        .int()
        .min(1)
        .max(AVAILABILITY.SUGGESTION_WEEKS)
        .default(AVAILABILITY.SUGGESTION_WEEKS),
});
