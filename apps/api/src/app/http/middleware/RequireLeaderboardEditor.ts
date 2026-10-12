import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendForbidden } from '../utils/ApiResponses';

/**
 * Lets only the board's editors through: who that is follows its edit mode,
 * and a group admin always is one; on a private board it is everybody on it.
 * They set and clear scores and remove people from the board. Runs after
 * `includeLeaderboard`.
 */
export const requireLeaderboardEditor: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.leaderboard.isEditableBy(req.membership)) {
        sendForbidden(res, 'Only its editors and admins change scores and members of this board');
        return;
    }
    next();
};
