import { z } from 'zod';
import { GroupRole } from '@bzim/types';

export const memberParamSchema = z.object({
    groupId: z.uuid(),
    userId: z.uuid(),
});

/** Owner stays owner; it only moves through the transfer endpoint. */
export const changeRoleSchema = z.object({
    role: z.enum([GroupRole.ADMIN, GroupRole.MEMBER]),
});

export const transferOwnershipSchema = z.object({
    userId: z.uuid(),
});
