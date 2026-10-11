import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendForbidden } from '../utils/ApiResponses';

/**
 * Lets only the activity's creator or a group admin through: editing and
 * deleting it, and planning, changing or removing its occurrences. Runs
 * after `includeActivity`.
 */
export const requireActivityManager: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.activity.isManagedBy(req.membership)) {
        sendForbidden(res, 'Only the creator or an admin manages an activity');
        return;
    }
    next();
};
