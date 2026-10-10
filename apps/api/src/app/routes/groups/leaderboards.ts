import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import LeaderboardController from '../../controllers/LeaderboardController';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import { groupIdParamSchema } from '../../validators/commonSchemas';
import {
    addLeaderboardMemberSchema,
    createLeaderboardSchema,
    historyQuerySchema,
    leaderboardMemberParamSchema,
    leaderboardParamSchema,
    scoresQuerySchema,
    setScoreSchema,
    updateLeaderboardSchema,
} from '../../validators/leaderboardSchemas';

/** Leaderboards, rankings, members and scores. Every route is a group member's; the finer rules are the controller's. */
export default class LeaderboardRoutes implements IRoute {
    private readonly controller = new LeaderboardController();

    getRoutes(): Router {
        const router = Router();
        const member = requireGroupRole(GroupRole.MEMBER);
        const groupId = ':groupId';
        const id = ':leaderboardId';

        router.get(
            API_ENDPOINTS.LEADERBOARDS.LIST(groupId),
            userAuth,
            validate({ params: groupIdParamSchema }),
            member,
            this.controller.list,
        );
        router.post(
            API_ENDPOINTS.LEADERBOARDS.CREATE(groupId),
            userAuth,
            validate({ params: groupIdParamSchema, body: createLeaderboardSchema }),
            member,
            this.controller.create,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema }),
            member,
            this.controller.detail,
        );
        router.patch(
            API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, body: updateLeaderboardSchema }),
            member,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema }),
            member,
            this.controller.delete,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.SCORES(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, query: scoresQuerySchema }),
            member,
            this.controller.scores,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.PERIODS(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema }),
            member,
            this.controller.periods,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.HISTORY(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, query: historyQuerySchema }),
            member,
            this.controller.history,
        );
        router.post(
            API_ENDPOINTS.LEADERBOARDS.MEMBERS(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, body: addLeaderboardMemberSchema }),
            member,
            this.controller.addMember,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.MEMBER(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema }),
            member,
            this.controller.removeMember,
        );
        router.put(
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema, body: setScoreSchema }),
            member,
            this.controller.setScore,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema }),
            member,
            this.controller.clearScore,
        );

        return router;
    }
}
