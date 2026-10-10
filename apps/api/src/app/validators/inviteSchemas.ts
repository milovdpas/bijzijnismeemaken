import { z } from 'zod';

import { handleSchema } from './userSchemas';

export const inviteSchema = z.object({
    handle: handleSchema,
});

export const groupInviteParamSchema = z.object({
    groupId: z.uuid(),
    inviteId: z.uuid(),
});

export const inviteIdParamSchema = z.object({
    inviteId: z.uuid(),
});
