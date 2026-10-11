import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { GroupRole } from '@bzim/types';

import type Activity from '../models/Activity.entity';
import { ActivityService } from '../services/ActivityService';
import { sendNotFound } from '../utils/ApiResponses';
import { activityParamSchema } from '../validators/activitySchemas';
import { paramsOf } from './ValidateRequest';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link includeActivity}: the activity in the path, with what its handlers read. */
            activity: Activity;
        }
    }
}

/**
 * Loads the activity in `:activityId` onto the request, looked up within
 * `req.group` (it runs after `requireGroupRole`). An inactive activity, whose
 * creator left the group, exists for admins only, who can still edit or
 * delete it. With `activeOnly` it is unknown to everyone, for what only a
 * live activity takes: planning it, saying you are in, date suggestions.
 */
export function includeActivity(options: { activeOnly?: boolean } = {}): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(
            req.group,
            activityId,
            options.activeOnly !== true && req.membership.hasRole(GroupRole.ADMIN),
        );
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        req.activity = activity;
        next();
    };
}
