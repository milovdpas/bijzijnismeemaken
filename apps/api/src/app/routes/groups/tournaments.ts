import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import TournamentController from '../../controllers/TournamentController';
import { includeTournament } from '../../middleware/IncludeTournament';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { requireTournamentManager } from '../../middleware/RequireTournamentManager';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
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
} from '../../validators/tournamentSchemas';

/**
 * Tournaments (M4). Every route is a group member's, and the routes of one
 * tournament load it with `includeTournament`. Running one is the organiser's
 * or an admin's (`requireTournamentManager`); viewing is anyone's in the
 * group, and a result is also its players', which the service decides.
 */
export default class TournamentRoutes implements IRoute {
    private readonly controller = new TournamentController();

    getRoutes(): Router {
        const router = Router();
        const member = requireGroupRole(GroupRole.MEMBER);
        const groupId = ':groupId';
        const id = ':tournamentId';
        const one = validate({ params: tournamentParamSchema });

        router.get(
            API_ENDPOINTS.TOURNAMENTS.LIST(groupId),
            userAuth,
            validate({ params: groupIdParamSchema, query: listTournamentsQuerySchema }),
            member,
            this.controller.list,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.CREATE(groupId),
            userAuth,
            validate({ params: groupIdParamSchema, body: createTournamentSchema }),
            member,
            this.controller.create,
        );
        router.get(
            API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, id),
            userAuth,
            one,
            member,
            includeTournament,
            this.controller.detail,
        );
        router.patch(
            API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, id),
            userAuth,
            validate({ params: tournamentParamSchema, body: updateTournamentSchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.TOURNAMENTS.DETAIL(groupId, id),
            userAuth,
            one,
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.delete,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.ENTRIES(groupId, id),
            userAuth,
            validate({ params: tournamentParamSchema, body: addEntrySchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.addEntry,
        );
        router.patch(
            API_ENDPOINTS.TOURNAMENTS.ENTRY(groupId, id, ':entryId'),
            userAuth,
            validate({ params: tournamentEntryParamSchema, body: updateEntrySchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.updateEntry,
        );
        router.delete(
            API_ENDPOINTS.TOURNAMENTS.ENTRY(groupId, id, ':entryId'),
            userAuth,
            validate({ params: tournamentEntryParamSchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.removeEntry,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.DRAW(groupId, id),
            userAuth,
            validate({ params: tournamentParamSchema, body: drawSchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.draw,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.START(groupId, id),
            userAuth,
            one,
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.start,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.ADVANCE(groupId, id),
            userAuth,
            one,
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.advance,
        );
        router.post(
            API_ENDPOINTS.TOURNAMENTS.FINISH(groupId, id),
            userAuth,
            one,
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.finish,
        );
        router.put(
            API_ENDPOINTS.TOURNAMENTS.RESULT(groupId, id, ':matchId'),
            userAuth,
            validate({ params: tournamentMatchParamSchema, body: matchResultSchema }),
            member,
            includeTournament,
            this.controller.report,
        );
        router.delete(
            API_ENDPOINTS.TOURNAMENTS.RESULT(groupId, id, ':matchId'),
            userAuth,
            validate({ params: tournamentMatchParamSchema }),
            member,
            includeTournament,
            requireTournamentManager,
            this.controller.clearResult,
        );

        return router;
    }
}
