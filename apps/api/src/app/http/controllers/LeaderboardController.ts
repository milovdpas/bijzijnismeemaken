import type {
    LeaderboardDetailDto,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { LeaderboardService } from '../../domain/services/LeaderboardService';
import { ScoreQueryService } from '../../domain/services/ScoreQueryService';
import { ScoreService } from '../../domain/services/ScoreService';
import {
    sendConflict,
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
    scoresQuerySchema,
    setScoreSchema,
    updateLeaderboardSchema,
} from '../validators/leaderboardSchemas';

/**
 * Leaderboards inside a group. `requireGroupRole(MEMBER)` has loaded
 * `req.group` and `req.membership`, and on the routes of one board
 * `includeLeaderboard` has loaded `req.leaderboard`. Settings are the
 * creator's or an admin's (`requireLeaderboardManager`); scores and taking
 * people off follow the edit mode (`requireLeaderboardEditor`).
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
        sendSuccess<LeaderboardDetailDto>(
            res,
            await LeaderboardService.detail(req.leaderboard, req.membership),
        );
    };

    update: Handler<BodyOf<typeof updateLeaderboardSchema>> = async (req, res) => {
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
        const result = await LeaderboardService.update(req.group, req.leaderboard, {
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
        await LeaderboardService.delete(req.leaderboard);
        sendNoContent(res);
    };

    scores: Handler = async (req, res) => {
        const { period, year, month, page, pageSize } = queryOf(req, scoresQuerySchema);
        sendSuccess<ScoresResponse>(
            res,
            await ScoreQueryService.page(
                req.leaderboard,
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
        sendSuccess<PeriodsResponse>(res, await ScoreQueryService.periods(req.leaderboard));
    };

    history: Handler = async (req, res) => {
        const { page, pageSize } = queryOf(req, historyQuerySchema);
        const result = await ScoreQueryService.history(req.leaderboard, page, pageSize);
        sendSuccess<Paginated<ScoreHistoryDto>>(
            res,
            paginate(result.items, result.total, page, pageSize),
        );
    };

    /** Any member puts somebody on the board: a group member by id, or a guest by name. */
    addMember: Handler<BodyOf<typeof addLeaderboardMemberSchema>> = async (req, res) => {
        const { userId, name, avatarKey } = req.body;
        if (userId === undefined) {
            const guest = await LeaderboardService.addGuest(
                req.leaderboard,
                name ?? '',
                avatarKey,
                req.user,
            );
            sendSuccess<LeaderboardMemberDto>(res, guest.toDto(), 201);
            return;
        }
        const result = await LeaderboardService.addMember(
            req.group,
            req.leaderboard,
            userId,
            req.user,
        );
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
        const { memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const member = await LeaderboardService.findMember(req.leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        await LeaderboardService.removeMember(req.leaderboard, member, req.user);
        sendNoContent(res);
    };

    setScore: Handler<BodyOf<typeof setScoreSchema>> = async (req, res) => {
        const { memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const member = await LeaderboardService.findMember(req.leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        const { score } = req.body;
        await ScoreService.set(req.leaderboard, member, req.user, score);
        sendNoContent(res);
    };

    clearScore: Handler = async (req, res) => {
        const { memberId } = paramsOf(req, leaderboardMemberParamSchema);
        const member = await LeaderboardService.findMember(req.leaderboard, memberId);
        if (member === null || !member.isActive()) {
            sendNotFound(res, 'Leaderboard member');
            return;
        }
        await ScoreService.clear(req.leaderboard, member, req.user);
        sendNoContent(res);
    };
}
