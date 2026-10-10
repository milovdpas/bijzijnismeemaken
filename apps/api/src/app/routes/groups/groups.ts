import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import GroupController from '../../controllers/GroupController';
import { publicLimit } from '../../middleware/ApiLimits';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { requireOnboarded } from '../../middleware/RequireOnboarded';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
import {
    createGroupSchema,
    joinTokenParamSchema,
    publicGroupsQuerySchema,
    updateGroupSchema,
} from '../../validators/groupSchemas';

/**
 * Groups. Literal paths (`/groups/public`) are declared before the `:groupId`
 * ones so Express never reads "public" as an id. Members and invites get their
 * own route groups.
 */
export default class GroupRoutes implements IRoute {
    private readonly controller = new GroupController();

    getRoutes(): Router {
        const router = Router();

        router.get(API_ENDPOINTS.GROUPS.LIST, userAuth, this.controller.list);
        router.post(
            API_ENDPOINTS.GROUPS.CREATE,
            userAuth,
            requireOnboarded,
            validate({ body: createGroupSchema }),
            this.controller.create,
        );
        router.get(
            API_ENDPOINTS.GROUPS.PUBLIC,
            userAuth,
            validate({ query: publicGroupsQuerySchema }),
            this.controller.searchPublic,
        );

        router.get(
            API_ENDPOINTS.GROUPS.DETAIL(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(),
            this.controller.detail,
        );
        router.patch(
            API_ENDPOINTS.GROUPS.DETAIL(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: updateGroupSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.GROUPS.DETAIL(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(GroupRole.OWNER),
            this.controller.delete,
        );

        router.post(
            API_ENDPOINTS.GROUPS.JOIN(':groupId'),
            userAuth,
            requireOnboarded,
            validate({ params: groupIdParamSchema }),
            this.controller.join,
        );
        router.post(
            API_ENDPOINTS.GROUPS.REGENERATE_INVITE_LINK(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema }),
            requireGroupRole(GroupRole.ADMIN),
            this.controller.regenerateInviteLink,
        );

        // Invite links are typed or pasted by anyone who has one: limited so a
        // loop cannot try tokens, and preview before join so the page can ask.
        router.get(
            API_ENDPOINTS.JOIN.BY_TOKEN(':token'),
            userAuth,
            publicLimit,
            validate({ params: joinTokenParamSchema }),
            this.controller.previewByToken,
        );
        router.post(
            API_ENDPOINTS.JOIN.BY_TOKEN(':token'),
            userAuth,
            requireOnboarded,
            publicLimit,
            validate({ params: joinTokenParamSchema }),
            this.controller.joinByToken,
        );

        return router;
    }
}
