import { ERROR_CODES } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { MembershipService } from '../../domain/services/MembershipService';
import {
    sendConflict,
    sendForbidden,
    sendNoContent,
    sendNotFound,
    sendSuccess,
} from '../utils/ApiResponses';
import {
    changeRoleSchema,
    memberParamSchema,
    transferOwnershipSchema,
} from '../validators/memberSchemas';

/**
 * Who is in a group and what happens to them. `requireGroupRole` has loaded
 * `req.group` and `req.membership` (the actor) before any of these run; the
 * service re-checks the role rules so they hold even if a route is miswired.
 */
export default class MemberController {
    list: Handler = async (req, res) => {
        sendSuccess<GroupMemberResponse[]>(res, await MembershipService.list(req.group));
    };

    changeRole: Handler<BodyOf<typeof changeRoleSchema>> = async (req, res) => {
        const { userId } = paramsOf(req, memberParamSchema);
        const { role } = req.body;
        const result = await MembershipService.changeRole(req.group, req.membership, userId, role);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the owner changes roles');
                    return;
                case 'CANNOT_TARGET_SELF':
                    sendConflict(res, 'You cannot change your own role');
                    return;
                case 'NOT_A_MEMBER':
                    sendNotFound(res, 'Member');
                    return;
            }
        }
        sendNoContent(res);
    };

    remove: Handler = async (req, res) => {
        const { userId } = paramsOf(req, memberParamSchema);
        const result = await MembershipService.remove(req.group, req.membership, userId);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Admins cannot remove admins or the owner');
                    return;
                case 'CANNOT_TARGET_SELF':
                    sendConflict(res, 'Leave the group instead');
                    return;
                case 'NOT_A_MEMBER':
                    sendNotFound(res, 'Member');
                    return;
            }
        }
        sendNoContent(res);
    };

    transferOwnership: Handler<BodyOf<typeof transferOwnershipSchema>> = async (req, res) => {
        const { userId } = req.body;
        const result = await MembershipService.transferOwnership(req.group, req.membership, userId);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the owner transfers ownership');
                    return;
                case 'CANNOT_TARGET_SELF':
                    sendConflict(res, 'You already own this group');
                    return;
                case 'NOT_A_MEMBER':
                    sendNotFound(res, 'Member');
                    return;
            }
        }
        sendNoContent(res);
    };

    leave: Handler = async (req, res) => {
        const result = await MembershipService.leave(req.group, req.membership);
        if (!result.ok) {
            sendConflict(res, 'Transfer ownership first', ERROR_CODES.OWNER_MUST_TRANSFER);
            return;
        }
        sendNoContent(res);
    };
}
