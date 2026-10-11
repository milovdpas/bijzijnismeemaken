import type { Request, Response } from 'express';
import type { TournamentDetailDto, TournamentListingDto } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import type Tournament from '../models/Tournament.entity';
import { TournamentPlayService } from '../services/TournamentPlayService';
import { TournamentService } from '../services/TournamentService';
import type { TournamentProblem, TournamentResult } from '../services/TournamentService';
import {
    sendConflict,
    sendForbidden,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import {
    addEntrySchema,
    createTournamentSchema,
    drawSchema,
    listTournamentsQuerySchema,
    matchResultSchema,
    tournamentEntryParamSchema,
    tournamentMatchParamSchema,
    tournamentParamSchema,
    updateEntrySchema,
    updateTournamentSchema,
} from '../validators/tournamentSchemas';

/** The ones that are about timing (not now, or not any more); the rest are about the input. */
const CONFLICTS: ReadonlySet<TournamentProblem> = new Set<TournamentProblem>([
    'NOT_DRAFT',
    'NOT_RUNNING',
    'FULL',
    'ALREADY_IN',
    'NOT_READY',
    'LATER_PLAYED',
    'NOT_GROUPS',
    'GROUPS_UNFINISHED',
    'ALREADY_ADVANCED',
    'FINAL_UNPLAYED',
]);

/**
 * Tournaments inside a group. `requireGroupRole(MEMBER)` has loaded
 * `req.group` and `req.membership`; creating and viewing are any member's,
 * running one is the organiser's or an admin's, and a result is also its
 * players' while it has none (the service decides that one).
 */
export default class TournamentController {
    list: Handler = async (req, res) => {
        const { status, activityId } = queryOf(req, listTournamentsQuerySchema);
        sendSuccess<TournamentListingDto[]>(
            res,
            await TournamentService.list(req.group, status, activityId),
        );
    };

    create: Handler<BodyOf<typeof createTournamentSchema>> = async (req, res) => {
        const {
            name,
            description,
            format,
            participantMode,
            teamSize,
            winPoints,
            drawPoints,
            groupCount,
            advancePerGroup,
            thirdPlace,
            activityId,
        } = req.body;
        const result = await TournamentService.create(req.group, req.user, {
            name,
            description,
            format,
            participantMode,
            teamSize,
            winPoints,
            drawPoints,
            groupCount,
            advancePerGroup,
            thirdPlace,
            activityId,
        });
        TournamentController.respond(req, res, result, 201);
    };

    detail: Handler = async (req, res) => {
        const tournament = await TournamentController.load(req, res);
        if (tournament === null) return;
        sendSuccess<TournamentDetailDto>(res, TournamentService.detail(tournament, req.membership));
    };

    update: Handler<BodyOf<typeof updateTournamentSchema>> = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const {
            name,
            description,
            format,
            participantMode,
            teamSize,
            winPoints,
            drawPoints,
            groupCount,
            advancePerGroup,
            thirdPlace,
        } = req.body;
        const result = await TournamentService.update(tournament, {
            name,
            description,
            format,
            participantMode,
            teamSize,
            winPoints,
            drawPoints,
            groupCount,
            advancePerGroup,
            thirdPlace,
        });
        TournamentController.respond(req, res, result);
    };

    delete: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        await TournamentService.delete(tournament);
        sendNoContent(res);
    };

    addEntry: Handler<BodyOf<typeof addEntrySchema>> = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const { userId, name, members } = req.body;
        const result = await TournamentService.addEntry(tournament, req.group, {
            userId,
            name,
            members,
        });
        TournamentController.respond(req, res, result, 201);
    };

    updateEntry: Handler<BodyOf<typeof updateEntrySchema>> = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const { entryId } = paramsOf(req, tournamentEntryParamSchema);
        const entry = tournament.entries.find((candidate) => candidate.id === entryId);
        if (entry === undefined) {
            sendNotFound(res, 'Entry');
            return;
        }
        const { name, members, seed, groupNo } = req.body;
        const result = await TournamentService.updateEntry(tournament, req.group, entry, {
            name,
            members,
            seed,
            groupNo,
        });
        TournamentController.respond(req, res, result);
    };

    removeEntry: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const { entryId } = paramsOf(req, tournamentEntryParamSchema);
        const entry = tournament.entries.find((candidate) => candidate.id === entryId);
        if (entry === undefined) {
            sendNotFound(res, 'Entry');
            return;
        }
        TournamentController.respond(
            req,
            res,
            await TournamentService.removeEntry(tournament, entry),
        );
    };

    draw: Handler<BodyOf<typeof drawSchema>> = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const { teams } = req.body;
        TournamentController.respond(
            req,
            res,
            await TournamentService.draw(tournament, teams ?? false),
        );
    };

    start: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        TournamentController.respond(req, res, await TournamentPlayService.start(tournament));
    };

    /** Not `managed`: a match's own players may enter its result, which the service checks. */
    report: Handler<BodyOf<typeof matchResultSchema>> = async (req, res) => {
        const tournament = await TournamentController.load(req, res);
        if (tournament === null) return;
        const { matchId } = paramsOf(req, tournamentMatchParamSchema);
        const match = tournament.matches.find((candidate) => candidate.id === matchId);
        if (match === undefined) {
            sendNotFound(res, 'Match');
            return;
        }
        const { homeScore, awayScore } = req.body;
        const result = await TournamentPlayService.report(tournament, match, req.membership, {
            homeScore,
            awayScore,
        });
        TournamentController.respond(req, res, result);
    };

    clearResult: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        const { matchId } = paramsOf(req, tournamentMatchParamSchema);
        const match = tournament.matches.find((candidate) => candidate.id === matchId);
        if (match === undefined) {
            sendNotFound(res, 'Match');
            return;
        }
        TournamentController.respond(
            req,
            res,
            await TournamentPlayService.clearResult(tournament, match),
        );
    };

    advance: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        TournamentController.respond(req, res, await TournamentPlayService.advance(tournament));
    };

    finish: Handler = async (req, res) => {
        const tournament = await TournamentController.managed(req, res);
        if (tournament === null) return;
        TournamentController.respond(req, res, await TournamentPlayService.finish(tournament));
    };

    /** The tournament in the path, of this group; a 404 sent when there is none. */
    private static async load(req: Request, res: Response): Promise<Tournament | null> {
        const { tournamentId } = paramsOf(req, tournamentParamSchema);
        const tournament = await TournamentService.findForGroup(req.group, tournamentId);
        if (tournament === null) sendNotFound(res, 'Tournament');
        return tournament;
    }

    /** The same, for the organiser or an admin only; a 403 for anybody else. */
    private static async managed(req: Request, res: Response): Promise<Tournament | null> {
        const tournament = await TournamentController.load(req, res);
        if (tournament === null) return null;
        if (!TournamentService.canManage(tournament, req.membership)) {
            sendForbidden(res, 'Only the organiser or an admin runs a tournament');
            return null;
        }
        return tournament;
    }

    /** The tournament as it now is, or why not: timing is a 409, the input a 422, rights a 403. */
    private static respond(
        req: Request,
        res: Response,
        result: TournamentResult,
        status: 200 | 201 = 200,
    ): void {
        if (result.ok) {
            sendSuccess<TournamentDetailDto>(
                res,
                TournamentService.detail(result.tournament, req.membership),
                status,
            );
            return;
        }
        const { problem } = result;
        if (problem === 'FORBIDDEN') {
            sendForbidden(res, 'Only the organiser or an admin changes this result');
        } else if (CONFLICTS.has(problem)) {
            sendConflict(res, 'Not possible at this point of the tournament', undefined, {
                problem,
            });
        } else {
            sendValidationFailed(res, 'That does not fit this tournament', { problem });
        }
    }
}
