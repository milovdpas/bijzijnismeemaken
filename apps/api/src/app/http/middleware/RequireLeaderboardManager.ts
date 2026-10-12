import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendForbidden } from '../utils/ApiResponses';

/**
 * Lets only the board's creator or a group admin through, or on a private
 * board everybody on it: its settings and deleting it. Runs after `includeLeaderboard`.
 */
export const requireLeaderboardManager: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.leaderboard.isManagedBy(req.membership)) {
        sendForbidden(res, 'Only the creator or an admin changes a leaderboard');
        return;
    }
    next();
};
