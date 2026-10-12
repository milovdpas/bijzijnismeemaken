import { z } from 'zod';
import {
    AVATAR_KEYS,
    EditMode,
    LEADERBOARD,
    LeaderboardPeriod,
    ScoreType,
    SortOrder,
} from '@bzim/types';

import { paginationQuerySchema } from './commonSchemas';

export const leaderboardParamSchema = z.object({
    groupId: z.uuid(),
    leaderboardId: z.uuid(),
});

export const leaderboardMemberParamSchema = leaderboardParamSchema.extend({
    memberId: z.uuid(),
});

const leaderboardFields = z.object({
    name: z.string().trim().min(LEADERBOARD.NAME_MIN_LENGTH).max(LEADERBOARD.NAME_MAX_LENGTH),
    description: z
        .string()
        .trim()
        .max(LEADERBOARD.DESCRIPTION_MAX_LENGTH)
        .nullable()
        .transform((value) => (value === '' ? null : value))
        .optional(),
    scoreType: z.enum(ScoreType),
    sortOrder: z.enum(SortOrder),
    editMode: z.enum(EditMode),
    editorIds: z.array(z.uuid()).max(500).optional(),
    showMonthly: z.boolean(),
    showYearly: z.boolean(),
    showAllTime: z.boolean(),
    showSteppers: z.boolean().optional(),
    cardPeriod: z.enum(LeaderboardPeriod).optional(),
});

/** Private or not is decided here, once; the update schema has no such field. */
export const createLeaderboardSchema = leaderboardFields.extend({
    isPrivate: z.boolean().optional(),
    memberIds: z.array(z.uuid()).max(LEADERBOARD.PRIVATE_MEMBERS_MAX).optional(),
    guestNames: z
        .array(
            z
                .string()
                .trim()
                .min(LEADERBOARD.GUEST_NAME_MIN_LENGTH)
                .max(LEADERBOARD.GUEST_NAME_MAX_LENGTH),
        )
        .max(LEADERBOARD.PRIVATE_MEMBERS_MAX)
        .optional(),
});

export const updateLeaderboardSchema = leaderboardFields
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

/** A group member by id, or a guest by name; exactly one of the two. */
export const addLeaderboardMemberSchema = z
    .object({
        userId: z.uuid().optional(),
        name: z
            .string()
            .trim()
            .min(LEADERBOARD.GUEST_NAME_MIN_LENGTH)
            .max(LEADERBOARD.GUEST_NAME_MAX_LENGTH)
            .optional(),
        avatarKey: z.enum(AVATAR_KEYS).optional(),
    })
    .refine(
        (body) => (body.userId === undefined) !== (body.name === undefined),
        'Give a userId or a name, not both',
    );

/** Three decimals at most; the column has no room for more, and a time is whole milliseconds. */
export const setScoreSchema = z.object({
    score: z
        .number()
        .min(0)
        .max(LEADERBOARD.SCORE_MAX)
        .transform((value) => Number(value.toFixed(LEADERBOARD.SCORE_DECIMALS))),
});

/** One up or one down: the plus and minus buttons, and a game posted from a tool. */
export const scoreStepSchema = z.object({
    delta: z.union([z.literal(1), z.literal(-1)]),
});

/** A period, and the month or year it refers to; absent means the current one. */
export const scoresQuerySchema = paginationQuerySchema.extend({
    period: z.enum(LeaderboardPeriod).default(LeaderboardPeriod.TOTAL),
    year: z.coerce.number().int().min(2000).max(2200).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
});

export const historyQuerySchema = paginationQuerySchema;
