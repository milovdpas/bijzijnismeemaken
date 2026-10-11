import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { GroupRole } from '@bzim/types';

import Group from '../../domain/models/Group.entity';
import GroupMember from '../../domain/models/GroupMember.entity';
import { sendForbidden, sendNotFound } from '../utils/ApiResponses';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link requireGroupRole}: the group in the path. */
            group: Group;
            /** Set by {@link requireGroupRole}: the caller's membership of it. */
            membership: GroupMember;
        }
    }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads the group in `:groupId` and the caller's membership, and refuses
 * anyone below `minimum`. Runs after `userAuth`.
 *
 * A non-member gets a 404, so a private group's id reveals nothing, unless
 * the group is public, where its existence is no secret and a 403 says the
 * useful thing: join first. A member below the required role gets a 403.
 */
export function requireGroupRole(minimum: GroupRole = GroupRole.MEMBER): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const groupId = req.params.groupId;
        if (typeof groupId !== 'string' || !UUID.test(groupId)) {
            sendNotFound(res, 'Group');
            return;
        }

        const group = await Group.findOneBy({ id: groupId });
        if (group === null) {
            sendNotFound(res, 'Group');
            return;
        }

        const membership = await GroupMember.findOneBy({ groupId, userId: req.user.id });
        if (membership === null) {
            if (group.isPublic()) {
                sendForbidden(res, 'Join this group first');
            } else {
                sendNotFound(res, 'Group');
            }
            return;
        }
        if (!membership.hasRole(minimum)) {
            sendForbidden(res, `This needs the ${minimum} role`);
            return;
        }

        req.group = group;
        req.membership = membership;
        next();
    };
}
