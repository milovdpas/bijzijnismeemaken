import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type Tournament from '../models/Tournament.entity';
import { TournamentService } from '../services/TournamentService';
import { sendNotFound } from '../utils/ApiResponses';
import { tournamentParamSchema } from '../validators/tournamentSchemas';
import { paramsOf } from './ValidateRequest';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link includeTournament}: the tournament in the path, with its entries and matches. */
            tournament: Tournament;
        }
    }
}

/**
 * Loads the tournament in `:tournamentId` onto the request, with everything
 * its handlers read. Runs after `requireGroupRole`, so the lookup is scoped
 * to `req.group`: another group's tournament is as unknown as a missing one.
 */
export const includeTournament: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { tournamentId } = paramsOf(req, tournamentParamSchema);
    const tournament = await TournamentService.findForGroup(req.group, tournamentId);
    if (tournament === null) {
        sendNotFound(res, 'Tournament');
        return;
    }
    req.tournament = tournament;
    next();
};
