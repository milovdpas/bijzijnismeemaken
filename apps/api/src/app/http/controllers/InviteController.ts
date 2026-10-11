import { GroupRole } from '@bzim/types';
import type { GroupDetailResponse, GroupInviteDto } from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import GroupPresenter from '../../domain/presenters/GroupPresenter';
import { InviteService } from '../../domain/services/InviteService';
import { sendConflict, sendNoContent, sendNotFound, sendSuccess } from '../utils/ApiResponses';
import {
    groupInviteParamSchema,
    inviteIdParamSchema,
    inviteSchema,
} from '../validators/inviteSchemas';

/**
 * Invitations. The group-scoped handlers run behind `requireGroupRole(ADMIN)`;
 * the `/invites/*` ones are the invitee's own, found by their user id so
 * nobody can answer somebody else's.
 */
export default class InviteController {
    invite: Handler<BodyOf<typeof inviteSchema>> = async (req, res) => {
        const { handle } = req.body;
        const result = await InviteService.invite(req.group, req.user, handle);
        if (!result.ok) {
            switch (result.problem) {
                case 'USER_NOT_FOUND':
                    sendNotFound(res, 'User');
                    return;
                case 'ALREADY_MEMBER':
                    sendConflict(res, 'Already a member', undefined, { reason: 'member' });
                    return;
                case 'ALREADY_INVITED':
                    sendConflict(res, 'Already invited', undefined, { reason: 'invited' });
                    return;
            }
        }
        sendSuccess<GroupInviteDto>(res, result.invite, 201);
    };

    listForGroup: Handler = async (req, res) => {
        sendSuccess<GroupInviteDto[]>(res, await InviteService.listForGroup(req.group));
    };

    cancel: Handler = async (req, res) => {
        const { inviteId } = paramsOf(req, groupInviteParamSchema);
        if (!(await InviteService.cancel(req.group, inviteId))) {
            sendNotFound(res, 'Invite');
            return;
        }
        sendNoContent(res);
    };

    listMine: Handler = async (req, res) => {
        sendSuccess<GroupInviteDto[]>(res, await InviteService.listForUser(req.user));
    };

    /** Answers with the group as the new member now sees it. */
    accept: Handler = async (req, res) => {
        const { inviteId } = paramsOf(req, inviteIdParamSchema);
        const invite = await InviteService.findForUser(inviteId, req.user);
        if (invite === null) {
            sendNotFound(res, 'Invite');
            return;
        }
        await InviteService.accept(invite);
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(invite.group, GroupRole.MEMBER, await invite.group.memberCount()),
            201,
        );
    };

    decline: Handler = async (req, res) => {
        const { inviteId } = paramsOf(req, inviteIdParamSchema);
        const invite = await InviteService.findForUser(inviteId, req.user);
        if (invite === null) {
            sendNotFound(res, 'Invite');
            return;
        }
        await InviteService.decline(invite);
        sendNoContent(res);
    };
}
