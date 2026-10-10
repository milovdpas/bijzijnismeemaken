import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import ActivityController from '../../controllers/ActivityController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import {
    activityParamSchema,
    createActivitySchema,
    interestOfParamSchema,
    listActivitiesQuerySchema,
    suggestionsQuerySchema,
    updateActivitySchema,
} from '../../validators/activitySchemas';
import { groupIdParamSchema } from '../../validators/commonSchemas';

/** Activities and "I'm in" marks. Every route is a member's; marking others is an admin's. */
export default class ActivityRoutes implements IRoute {
    private readonly controller = new ActivityController();

    getRoutes(): Router {
        const router = Router();
        const member = requireGroupRole(GroupRole.MEMBER);
        const admin = requireGroupRole(GroupRole.ADMIN);

        router.get(
            API_ENDPOINTS.ACTIVITIES.LIST(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, query: listActivitiesQuerySchema }),
            member,
            this.controller.list,
        );
        router.post(
            API_ENDPOINTS.ACTIVITIES.CREATE(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, body: createActivitySchema }),
            member,
            this.controller.create,
        );
        router.get(
            API_ENDPOINTS.ACTIVITIES.DETAIL(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema }),
            member,
            this.controller.detail,
        );
        router.patch(
            API_ENDPOINTS.ACTIVITIES.DETAIL(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema, body: updateActivitySchema }),
            member,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.ACTIVITIES.DETAIL(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema }),
            member,
            this.controller.delete,
        );

        router.get(
            API_ENDPOINTS.ACTIVITIES.SUGGESTIONS(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema, query: suggestionsQuerySchema }),
            member,
            this.controller.suggestions,
        );

        router.put(
            API_ENDPOINTS.ACTIVITIES.INTEREST(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema }),
            member,
            this.controller.markMeIn,
        );
        router.delete(
            API_ENDPOINTS.ACTIVITIES.INTEREST(':groupId', ':activityId'),
            userAuth,
            validate({ params: activityParamSchema }),
            member,
            this.controller.markMeOut,
        );
        router.put(
            API_ENDPOINTS.ACTIVITIES.INTEREST_OF(':groupId', ':activityId', ':userId'),
            userAuth,
            validate({ params: interestOfParamSchema }),
            admin,
            this.controller.markMemberIn,
        );
        router.delete(
            API_ENDPOINTS.ACTIVITIES.INTEREST_OF(':groupId', ':activityId', ':userId'),
            userAuth,
            validate({ params: interestOfParamSchema }),
            admin,
            this.controller.markMemberOut,
        );

        return router;
    }
}
