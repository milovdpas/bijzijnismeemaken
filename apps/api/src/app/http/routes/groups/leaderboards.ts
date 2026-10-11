import { Router } from 'express';
import { API_ENDPOINTS, GroupRole } from '@bzim/types';

import type { IRoute } from '../../interfaces/IRouter';
import LeaderboardController from '../../controllers/LeaderboardController';
import { includeLeaderboard } from '../../middleware/IncludeLeaderboard';
import { requireGroupRole } from '../../middleware/RequireGroupRole';
import { requireLeaderboardEditor } from '../../middleware/RequireLeaderboardEditor';
import { requireLeaderboardManager } from '../../middleware/RequireLeaderboardManager';
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
            includeLeaderboard,
            this.controller.detail,
        );
        router.patch(
            API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, body: updateLeaderboardSchema }),
            member,
            includeLeaderboard,
            requireLeaderboardManager,
            this.controller.update,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.DETAIL(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema }),
            member,
            includeLeaderboard,
            requireLeaderboardManager,
            this.controller.delete,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.SCORES(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, query: scoresQuerySchema }),
            member,
            includeLeaderboard,
            this.controller.scores,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.PERIODS(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema }),
            member,
            includeLeaderboard,
            this.controller.periods,
        );
        router.get(
            API_ENDPOINTS.LEADERBOARDS.HISTORY(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, query: historyQuerySchema }),
            member,
            includeLeaderboard,
            this.controller.history,
        );
        router.post(
            API_ENDPOINTS.LEADERBOARDS.MEMBERS(groupId, id),
            userAuth,
            validate({ params: leaderboardParamSchema, body: addLeaderboardMemberSchema }),
            member,
            includeLeaderboard,
            this.controller.addMember,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.MEMBER(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema }),
            member,
            includeLeaderboard,
            requireLeaderboardEditor,
            this.controller.removeMember,
        );
        router.put(
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema, body: setScoreSchema }),
            member,
            includeLeaderboard,
            requireLeaderboardEditor,
            this.controller.setScore,
        );
        router.delete(
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(groupId, id, ':memberId'),
            userAuth,
            validate({ params: leaderboardMemberParamSchema }),
            member,
            includeLeaderboard,
            requireLeaderboardEditor,
            this.controller.clearScore,
        );

        return router;
    }
}
