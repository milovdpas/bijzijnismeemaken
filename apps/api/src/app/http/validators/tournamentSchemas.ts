import { z } from 'zod';
import { ParticipantMode, TOURNAMENT, TournamentFormat, TournamentStatus } from '@bzim/types';

export const tournamentParamSchema = z.object({
    groupId: z.uuid(),
    tournamentId: z.uuid(),
});

export const tournamentEntryParamSchema = tournamentParamSchema.extend({
    entryId: z.uuid(),
});

export const tournamentMatchParamSchema = tournamentParamSchema.extend({
    matchId: z.uuid(),
});

/**
 * No status: what is on, running first, then drafts; `finished` is the
 * archive. With `activityId` and no status: that activity's tournaments,
 * whatever they are at.
 */
export const listTournamentsQuerySchema = z.object({
    status: z.enum(TournamentStatus).optional(),
    activityId: z.uuid().optional(),
});

const settingsFields = z.object({
    name: z.string().trim().min(TOURNAMENT.NAME_MIN_LENGTH).max(TOURNAMENT.NAME_MAX_LENGTH),
    description: z
        .string()
        .trim()
        .max(TOURNAMENT.DESCRIPTION_MAX_LENGTH)
        .nullable()
        .transform((value) => (value === '' ? null : value))
        .optional(),
    format: z.enum(TournamentFormat),
    participantMode: z.enum(ParticipantMode),
    teamSize: z
        .number()
        .int()
        .min(TOURNAMENT.TEAM_SIZE_MIN)
        .max(TOURNAMENT.TEAM_SIZE_MAX)
        .nullable()
        .optional(),
    winPoints: z.number().int().min(0).max(TOURNAMENT.POINTS_MAX).optional(),
    drawPoints: z.number().int().min(0).max(TOURNAMENT.POINTS_MAX).optional(),
    groupCount: z.number().int().min(1).max(TOURNAMENT.GROUP_COUNT_MAX).nullable().optional(),
    advancePerGroup: z
        .number()
        .int()
        .min(1)
        .max(TOURNAMENT.ADVANCE_PER_GROUP_MAX)
        .nullable()
        .optional(),
    thirdPlace: z.boolean().optional(),
});

export const createTournamentSchema = settingsFields.extend({
    activityId: z.uuid().nullable().optional(),
});

export const updateTournamentSchema = settingsFields
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

/** A person in an entry: a group member by id, or a guest by name. */
const personSchema = z
    .object({
        userId: z.uuid().optional(),
        name: z.string().trim().min(1).max(TOURNAMENT.GUEST_NAME_MAX_LENGTH).optional(),
    })
    .refine(
        (person) => (person.userId === undefined) !== (person.name === undefined),
        'A person is a userId or a name',
    );

const people = z.array(personSchema).min(1).max(TOURNAMENT.TEAM_SIZE_MAX);
const entryName = z.string().trim().min(1).max(TOURNAMENT.ENTRY_NAME_MAX_LENGTH);

/**
 * A member (`userId`) or a guest (`name`) as a player; or a team: `members`,
 * optionally with a `name`. A guest's name is a person's, so it is held to a
 * display name's length.
 */
export const addEntrySchema = z
    .object({
        userId: z.uuid().optional(),
        name: entryName.optional(),
        members: people.optional(),
    })
    .refine(
        (body) =>
            body.members !== undefined
                ? body.userId === undefined
                : (body.userId === undefined) !== (body.name === undefined),
        'A member, a guest by name, or a team of members',
    )
    .refine(
        (body) =>
            body.members !== undefined ||
            body.name === undefined ||
            body.name.length <= TOURNAMENT.GUEST_NAME_MAX_LENGTH,
        `A guest's name is at most ${String(TOURNAMENT.GUEST_NAME_MAX_LENGTH)} characters`,
    );

export const updateEntrySchema = z
    .object({
        name: entryName.optional(),
        members: people.optional(),
        seed: z.number().int().min(1).max(TOURNAMENT.MAX_ENTRIES).optional(),
        groupNo: z.number().int().min(1).max(TOURNAMENT.GROUP_COUNT_MAX).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

/** The body is optional: an empty draw only shuffles the seeds. */
export const drawSchema = z.object({ teams: z.boolean().optional() }).default({});

export const matchResultSchema = z.object({
    homeScore: z.number().int().min(0).max(TOURNAMENT.SCORE_MAX),
    awayScore: z.number().int().min(0).max(TOURNAMENT.SCORE_MAX),
});
