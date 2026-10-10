import type {
    LeaderboardDetailDto,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { LeaderboardService } from '../services/LeaderboardService';
import { ScoreQueryService } from '../services/ScoreQueryService';
import { ScoreService } from '../services/ScoreService';
import {
    sendConflict,
    sendForbidden,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import { paginate } from '../utils/Pagination';
import {
    addLeaderboardMemberSchema,
    createLeaderboardSchema,
    historyQuerySchema,
    leaderboardMemberParamSchema,
    leaderboardParamSchema,
    scoresQuerySchema,
    setScoreSchema,
    updateLeaderboardSchema,
} from '../validators/leaderboardSchemas';

/**
 * Leaderboards inside a group. `requireGroupRole(MEMBER)` has loaded
 * `req.group` and `req.membership`; the finer rules (creator, admin, edit
 * mode) are the service's and are checked here per action.
 */
export default class LeaderboardController {
    list: Handler = async (req, res) => {
        sendSuccess<LeaderboardListingDto[]>(
            res,
            await LeaderboardService.listForGroup(req.group, req.membership),
        );
    };

    create: Handler<BodyOf<typeof createLeaderboardSchema>> = async (req, res) => {
        const {
            name,
            description,
            scoreType,
            sortOrder,
            editMode,
            editorIds,
            showMonthly,
            showYearly,
            showAllTime,
            showSteppers,
            cardPeriod,
        } = req.body;
        const result = await LeaderboardService.create(req.group, req.user, {
            name,
            description,
            scoreType,
            sortOrder,
            editMode,
            editorIds,
            showMonthly,
            showYearly,
            showAllTime,
            showSteppers,
            cardPeriod,
        });
        if (!result.ok) {
            sendValidationFailed(res, 'The settings do not agree', { problem: result.problem });
            return;
        }
        sendSuccess<LeaderboardDetailDto>(
            res,
            await LeaderboardService.detail(result.leaderboard, req.membership),
            201,
        );
    };

    detail: Handler = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        sendSuccess<LeaderboardDetailDto>(
            res,
            await LeaderboardService.detail(leaderboard, req.membership),
        );
    };

    update: Handler<BodyOf<typeof updateLeaderboardSchema>> = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        if (!LeaderboardService.canManage(leaderboard, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin changes a leaderboard');
            return;
        }
        const {
            name,
            description,
            scoreType,
            sortOrder,
            editMode,
            editorIds,
            showMonthly,
            showYearly,
            showAllTime,
            showSteppers,
            cardPeriod,
        } = req.body;
        const result = await LeaderboardService.update(req.group, leaderboard, {
            name,
            description,
            scoreType,
            sortOrder,
            editMode,
            editorIds,
            showMonthly,
            showYearly,
            showAllTime,
            showSteppers,
            cardPeriod,
        });
        if (!result.ok) {
            sendValidationFailed(res, 'The settings do not agree', { problem: result.problem });
            return;
        }
        sendSuccess<LeaderboardDetailDto>(
            res,
            await LeaderboardService.detail(result.leaderboard, req.membership),
        );
    };

    delete: Handler = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        if (!LeaderboardService.canManage(leaderboard, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin deletes a leaderboard');
            return;
        }
        await LeaderboardService.delete(leaderboard);
        sendNoContent(res);
    };

    scores: Handler = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const { period, year, month, page, pageSize } = queryOf(req, scoresQuerySchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        sendSuccess<ScoresResponse>(
            res,
            await ScoreQueryService.page(
                leaderboard,
                period,
                year,
                month,
                page,
                pageSize,
                req.user.id,
            ),
        );
    };

    periods: Handler = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        sendSuccess<PeriodsResponse>(res, await ScoreQueryService.periods(leaderboard));
    };

    history: Handler = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const { page, pageSize } = queryOf(req, historyQuerySchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        const result = await ScoreQueryService.history(leaderboard, page, pageSize);
        sendSuccess<Paginated<ScoreHistoryDto>>(
            res,
            paginate(result.items, result.total, page, pageSize),
        );
    };

    /** Any member puts somebody on the board: a group member by id, or a guest by name. */
    addMember: Handler<BodyOf<typeof addLeaderboardMemberSchema>> = async (req, res) => {
        const { leaderboardId } = paramsOf(req, leaderboardParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        const { userId, name, avatarKey } = req.body;
        if (userId === undefined) {
            const guest = await LeaderboardService.addGuest(
                leaderboard,
                name ?? '',
                avatarKey,
                req.user,
            );
            sendSuccess<LeaderboardMemberDto>(res, guest.toDto(), 201);
            return;
        }
        const result = await LeaderboardService.addMember(req.group, leaderboard, userId, req.user);
        if (!result.ok) {
            switch (result.problem) {
                case 'NOT_A_GROUP_MEMBER':
                    sendNotFound(res, 'Member');
                    return;
                case 'NO_PROFILE':
                    sendConflict(res, 'That person has not finished their profile');
                    return;
            }
        }
        sendSuccess<LeaderboardMemberDto>(res, result.member.toDto(), 201);
    };

    removeMember: Handler = async (req, res) => {
        const { leaderboardId, memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        if (!LeaderboardService.canRemoveMember(leaderboard, req.membership)) {
            sendForbidden(res, 'Only editors and admins remove leaderboard members');
            return;
        }
        const member = await LeaderboardService.findMember(leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        await LeaderboardService.removeMember(leaderboard, member, req.user);
        sendNoContent(res);
    };

    setScore: Handler<BodyOf<typeof setScoreSchema>> = async (req, res) => {
        const { leaderboardId, memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        if (!LeaderboardService.canEditScores(leaderboard, req.membership)) {
            sendForbidden(res, 'You may not set scores on this leaderboard');
            return;
        }
        const member = await LeaderboardService.findMember(leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        const { score } = req.body;
        await ScoreService.set(leaderboard, member, req.user, score);
        sendNoContent(res);
    };

    clearScore: Handler = async (req, res) => {
        const { leaderboardId, memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const leaderboard = await LeaderboardService.findForGroup(req.group, leaderboardId);
        if (leaderboard === null) {
            sendNotFound(res, 'Leaderboard');
            return;
        }
        if (!LeaderboardService.canEditScores(leaderboard, req.membership)) {
            sendForbidden(res, 'You may not clear scores on this leaderboard');
            return;
        }
        const member = await LeaderboardService.findMember(leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        await ScoreService.clear(leaderboard, member, req.user);
        sendNoContent(res);
    };
}
