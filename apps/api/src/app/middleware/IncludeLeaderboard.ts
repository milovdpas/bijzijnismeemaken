import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type Leaderboard from '../models/Leaderboard.entity';
import { LeaderboardService } from '../services/LeaderboardService';
import { sendNotFound } from '../utils/ApiResponses';
import { leaderboardParamSchema } from '../validators/leaderboardSchemas';
import { paramsOf } from './ValidateRequest';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link includeLeaderboard}: the board in the path, with its editors and members. */
            leaderboard: Leaderboard;
        }
    }
}

/**
 * Loads the leaderboard in `:leaderboardId` onto the request, looked up
 * within `req.group` (it runs after `requireGroupRole`), so another group's
 * board is as unknown as a missing one.
 */
export const includeLeaderboard: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
    const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
    if (leaderboard === null) {
        sendNotFound(res, 'Leaderboard');
        return;
    }
    req.leaderboard = leaderboard;
    next();
};
