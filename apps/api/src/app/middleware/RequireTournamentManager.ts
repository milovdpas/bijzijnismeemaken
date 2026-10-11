import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendForbidden } from '../utils/ApiResponses';

/**
 * Lets only the organiser or a group admin through: settings, entries, the
 * draw, and running the tournament. Runs after `includeTournament`. A
 * match's players entering its result is a different rule, decided by the
 * service, because it depends on the match.
 */
export const requireTournamentManager: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.tournament.isManagedBy(req.membership)) {
        sendForbidden(res, 'Only the organiser or an admin runs a tournament');
        return;
    }
    next();
};
