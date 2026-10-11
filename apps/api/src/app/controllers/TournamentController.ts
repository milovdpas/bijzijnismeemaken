import type { TournamentDetailDto, TournamentListingDto } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { TournamentPlayService } from '../services/TournamentPlayService';
import { TournamentService } from '../services/TournamentService';
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
    updateEntrySchema,
    updateTournamentSchema,
} from '../validators/tournamentSchemas';

/**
 * Tournaments inside a group. `requireGroupRole(MEMBER)` has loaded
 * `req.group` and `req.membership`, and on the routes of one tournament
 * `includeTournament` has loaded `req.tournament`. The services decide who
 * may do what and answer `FORBIDDEN`; refusals about timing are a 409 and
 * about the input a 422, both with `details.problem` for the screen.
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
        if (!result.ok) {
            switch (result.problem) {
                case 'TEAM_SIZE':
                case 'GROUPS':
                case 'POINTS':
                    sendValidationFailed(res, 'The settings do not agree', {
                        problem: result.problem,
                    });
                    return;
                case 'ACTIVITY':
                    sendValidationFailed(res, 'Not a tournament activity of this group', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
            201,
        );
    };

    detail: Handler = (req, res) => {
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(req.tournament, req.membership),
        );
    };

    update: Handler<BodyOf<typeof updateTournamentSchema>> = async (req, res) => {
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
        const result = await TournamentService.update(req.tournament, req.membership, {
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
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin changes a tournament');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(
                        res,
                        'After the start only the name and description change',
                        undefined,
                        {
                            problem: result.problem,
                        },
                    );
                    return;
                case 'TEAM_SIZE':
                case 'GROUPS':
                case 'POINTS':
                    sendValidationFailed(res, 'The settings do not agree', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    delete: Handler = async (req, res) => {
        const result = await TournamentService.delete(req.tournament, req.membership);
        if (!result.ok) {
            sendForbidden(res, 'Only the organiser or an admin deletes a tournament');
            return;
        }
        sendNoContent(res);
    };

    addEntry: Handler<BodyOf<typeof addEntrySchema>> = async (req, res) => {
        const { userId, name, members } = req.body;
        const result = await TournamentService.addEntry(req.tournament, req.membership, {
            userId,
            name,
            members,
        });
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin changes the entries');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(res, 'The entries are fixed once it has started', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'FULL':
                    sendConflict(res, 'The entry list is full', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'ALREADY_IN':
                    sendConflict(res, 'Somebody plays in an entry already', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'TEAM_SIZE':
                    sendValidationFailed(res, 'That many people do not fit an entry', {
                        problem: result.problem,
                    });
                    return;
                case 'NOT_A_GROUP_MEMBER':
                    sendValidationFailed(res, 'Somebody is not in the group or has no profile', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
            201,
        );
    };

    updateEntry: Handler<BodyOf<typeof updateEntrySchema>> = async (req, res) => {
        const { entryId } = paramsOf(req, tournamentEntryParamSchema);
        const { name, members, seed, groupNo } = req.body;
        const entry = req.tournament.entries.find((candidate) => candidate.id === entryId);
        if (entry === undefined) {
            sendNotFound(res, 'Entry');
            return;
        }
        const result = await TournamentService.updateEntry(req.tournament, entry, req.membership, {
            name,
            members,
            seed,
            groupNo,
        });
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin changes the entries');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(res, 'The entries are fixed once it has started', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'ALREADY_IN':
                    sendConflict(res, 'Somebody plays in an entry already', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'GROUPS':
                    sendValidationFailed(res, 'This tournament has no such group', {
                        problem: result.problem,
                    });
                    return;
                case 'TEAM_SIZE':
                    sendValidationFailed(res, 'That many people do not fit an entry', {
                        problem: result.problem,
                    });
                    return;
                case 'NOT_A_GROUP_MEMBER':
                    sendValidationFailed(res, 'Somebody is not in the group or has no profile', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    removeEntry: Handler = async (req, res) => {
        const { entryId } = paramsOf(req, tournamentEntryParamSchema);
        const entry = req.tournament.entries.find((candidate) => candidate.id === entryId);
        if (entry === undefined) {
            sendNotFound(res, 'Entry');
            return;
        }
        const result = await TournamentService.removeEntry(req.tournament, entry, req.membership);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin changes the entries');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(res, 'The entries are fixed once it has started', undefined, {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    draw: Handler<BodyOf<typeof drawSchema>> = async (req, res) => {
        const { teams } = req.body;
        const result = await TournamentService.draw(req.tournament, req.membership, teams ?? false);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin makes the draw');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(res, 'The draw is fixed once it has started', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'TOO_FEW_PEOPLE':
                    sendValidationFailed(res, 'Random teams need people for two teams', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    start: Handler = async (req, res) => {
        const result = await TournamentPlayService.start(req.tournament, req.membership);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin starts a tournament');
                    return;
                case 'NOT_DRAFT':
                    sendConflict(res, 'This tournament has started already', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'TOO_FEW_ENTRIES':
                case 'TEAM_SIZE':
                case 'GROUPS':
                case 'ADVANCE':
                    sendValidationFailed(res, 'This draft cannot start yet', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    report: Handler<BodyOf<typeof matchResultSchema>> = async (req, res) => {
        const { matchId } = paramsOf(req, tournamentMatchParamSchema);
        const { homeScore, awayScore } = req.body;
        const match = req.tournament.matches.find((candidate) => candidate.id === matchId);
        if (match === undefined) {
            sendNotFound(res, 'Match');
            return;
        }
        const result = await TournamentPlayService.report(req.tournament, match, req.membership, {
            homeScore,
            awayScore,
        });
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only its players, the organiser or an admin enter this');
                    return;
                case 'NOT_RUNNING':
                    sendConflict(res, 'Results go in while the tournament runs', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'NOT_READY':
                    sendConflict(res, 'This match does not have two sides', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'LATER_PLAYED':
                    sendConflict(res, 'A later match was played on this result', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'DRAW_IN_KNOCKOUT':
                    sendValidationFailed(res, 'A knockout match needs a winner', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    clearResult: Handler = async (req, res) => {
        const { matchId } = paramsOf(req, tournamentMatchParamSchema);
        const match = req.tournament.matches.find((candidate) => candidate.id === matchId);
        if (match === undefined) {
            sendNotFound(res, 'Match');
            return;
        }
        const result = await TournamentPlayService.clearResult(
            req.tournament,
            match,
            req.membership,
        );
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin clears a result');
                    return;
                case 'NOT_RUNNING':
                    sendConflict(res, 'Results change while the tournament runs', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'NOT_READY':
                    sendConflict(res, 'This match does not have two sides', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'LATER_PLAYED':
                    sendConflict(res, 'A later match was played on this result', undefined, {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    advance: Handler = async (req, res) => {
        const result = await TournamentPlayService.advance(req.tournament, req.membership);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin draws the knockout');
                    return;
                case 'NOT_GROUPS':
                    sendConflict(res, 'Only a group stage advances', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'NOT_RUNNING':
                    sendConflict(res, 'The tournament is not running', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'ALREADY_ADVANCED':
                    sendConflict(res, 'The knockout is drawn already', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'GROUPS_UNFINISHED':
                    sendConflict(res, 'Group matches are still to be played', undefined, {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };

    finish: Handler = async (req, res) => {
        const result = await TournamentPlayService.finish(req.tournament, req.membership);
        if (!result.ok) {
            switch (result.problem) {
                case 'FORBIDDEN':
                    sendForbidden(res, 'Only the organiser or an admin finishes a tournament');
                    return;
                case 'NOT_RUNNING':
                    sendConflict(res, 'The tournament is not running', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'FINAL_UNPLAYED':
                    sendConflict(res, 'The final has no result yet', undefined, {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<TournamentDetailDto>(
            res,
            TournamentService.detail(result.tournament, req.membership),
        );
    };
}
