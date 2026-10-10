import { z } from 'zod';
import { GROUP, GroupAccess } from '@bzim/types';

import { paginationQuerySchema } from './commonSchemas';

const name = z.string().trim().min(GROUP.NAME_MIN_LENGTH).max(GROUP.NAME_MAX_LENGTH);

/** An empty description is stored as null, so "nothing" has one spelling. */
const description = z
    .string()
    .trim()
    .max(GROUP.DESCRIPTION_MAX_LENGTH)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const createGroupSchema = z.object({
    name,
    description: description.optional().default(null),
    access: z.enum(GroupAccess),
});

export const updateGroupSchema = z
    .object({
        name,
        description,
        access: z.enum(GroupAccess),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

export const publicGroupsQuerySchema = paginationQuerySchema.extend({
    q: z.string().trim().max(GROUP.NAME_MAX_LENGTH).default(''),
});

export const joinTokenParamSchema = z.object({
    token: z.string().length(GROUP.INVITE_TOKEN_LENGTH),
});
