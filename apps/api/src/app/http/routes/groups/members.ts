import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../interfaces/IRouter';
import MemberController from '../../controllers/MemberController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
import {
    changeRoleSchema,
    memberParamSchema,
    transferOwnershipSchema,
} from '../../validators/memberSchemas';

/** Membership of one group. The required role per route mirrors docs/05. */
export default class MemberRoutes implements IRoute {
    private readonly controller = new MemberController();

    getRoutes(): Router {
        const router = Router();

        router.get(
            API_ENDPOINTS.GROUPS.MEMBERS(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(),
            this.controller.list,
        );
        router.patch(
            API_ENDPOINTS.GROUPS.MEMBER(':groupId', ':userId'),
            userAuth,
            validate({ params: memberParamSchema, body: changeRoleSchema }),
            requireGroupRole(GroupRole.OWNER),
            this.controller.changeRole,
        );
        router.delete(
            API_ENDPOINTS.GROUPS.MEMBER(':groupId', ':userId'),
            userAuth,
            validate({ params: memberParamSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.remove,
        );
        router.post(
            API_ENDPOINTS.GROUPS.TRANSFER_OWNERSHIP(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: transferOwnershipSchema }),
            requireGroupRole(GroupRole.OWNER),
            this.controller.transferOwnership,
        );
        router.post(
            API_ENDPOINTS.GROUPS.LEAVE(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(),
            this.controller.leave,
        );

        return router;
    }
}
