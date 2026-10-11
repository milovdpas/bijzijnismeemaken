import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../interfaces/IRouter';
import OccurrenceController from '../../controllers/OccurrenceController';
import { notifyLimit, publicLimit } from '../../middleware/ApiLimits';
import { includeActivity } from '../../middleware/IncludeActivity';
import { requireActivityManager } from '../../middleware/RequireActivityManager';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { activityParamSchema } from '../../validators/activitySchemas';
import { groupIdParamSchema, rangeQuerySchema } from '../../validators/commonSchemas';
import {
    icsQuerySchema,
    occurrenceIdParamSchema,
    occurrenceParamSchema,
    planOccurrenceSchema,
    updateOccurrenceSchema,
} from '../../validators/occurrenceSchemas';

/** Planning inside a group, the group agenda, and the public calendar file. */
export default class OccurrenceRoutes implements IRoute {
    private readonly controller = new OccurrenceController();

    getRoutes(): Router {
        const router = Router();
        const member = requireGroupRole(GroupRole.MEMBER);
        const activity = includeActivity();
        const liveActivity = includeActivity({ activeOnly: true });

        router.post(
            API_ENDPOINTS.ACTIVITIES.OCCURRENCES(':groupId', ':activityId'),
            userAuth,
            notifyLimit,
            validate({ params: activityParamSchema, body: planOccurrenceSchema }),
            member,
            liveActivity,
            requireActivityManager,
            this.controller.plan,
        );
        router.patch(
            API_ENDPOINTS.ACTIVITIES.OCCURRENCE(':groupId', ':activityId', ':occurrenceId'),
            userAuth,
            notifyLimit,
            validate({ params: occurrenceParamSchema, body: updateOccurrenceSchema }),
            member,
            activity,
            requireActivityManager,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.ACTIVITIES.OCCURRENCE(':groupId', ':activityId', ':occurrenceId'),
            userAuth,
            validate({ params: occurrenceParamSchema }),
            member,
            activity,
            requireActivityManager,
            this.controller.delete,
        );
        router.get(
            API_ENDPOINTS.GROUPS.OCCURRENCES(':groupId'),
            userAuth,
            validate({ params: groupIdParamSchema, query: rangeQuerySchema }),
            member,
            this.controller.listForGroup,
        );

        // No session: a calendar app opens this straight from the email.
        router.get(
            API_ENDPOINTS.OCCURRENCES.ICS(':occurrenceId'),
            publicLimit,
            validate({ params: occurrenceIdParamSchema, query: icsQuerySchema }),
            this.controller.ics,
        );

        return router;
    }
}
