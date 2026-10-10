import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import InviteController from '../../controllers/InviteController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
import {
    groupInviteParamSchema,
    inviteIdParamSchema,
    inviteSchema,
} from '../../validators/inviteSchemas';

/** Sending invites is an admin's job inside a group; answering them is the invitee's own. */
export default class InviteRoutes implements IRoute {
    private readonly controller = new InviteController();

    getRoutes(): Router {
        const router = Router();

        router.post(
            API_ENDPOINTS.GROUPS.INVITES(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: inviteSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.invite,
        );
        router.get(
            API_ENDPOINTS.GROUPS.INVITES(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.listForGroup,
        );
        router.delete(
            API_ENDPOINTS.GROUPS.INVITE(':groupId', ':inviteId'),
            userAuth,
            validate({ params: groupInviteParamSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.cancel,
        );

        router.get(API_ENDPOINTS.INVITES.LIST, userAuth, this.controller.listMine);
        router.post(
            API_ENDPOINTS.INVITES.ACCEPT(':inviteId'),
            userAuth,
            validate({ params: inviteIdParamSchema }),
            this.controller.accept,
        );
        router.post(
            API_ENDPOINTS.INVITES.DECLINE(':inviteId'),
            userAuth,
            validate({ params: inviteIdParamSchema }),
            this.controller.decline,
        );

        return router;
    }
}
