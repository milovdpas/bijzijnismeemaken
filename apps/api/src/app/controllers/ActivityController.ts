import { GroupRole } from '@bzim/types';
import type { ActivityDetailDto, ActivityListingDto, SuggestionsResponse } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import GroupMember from '../models/GroupMember.entity';
import { ActivityService } from '../services/ActivityService';
import { NotificationService } from '../services/NotificationService';
import { SuggestionService } from '../services/SuggestionService';
import {
    sendForbidden,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import {
    activityParamSchema,
    createActivitySchema,
    interestOfParamSchema,
    listActivitiesQuerySchema,
    suggestionsQuerySchema,
    updateActivitySchema,
} from '../validators/activitySchemas';
import { today } from '../utils/Dates';

/**
 * Activities inside a group. `requireGroupRole` has loaded `req.group` and
 * `req.membership`. Inactive activities (their creator left) exist only for
 * admins; for everyone else they are not found.
 */
export default class ActivityController {
    list: Handler = async (req, res) => {
        const { label, recurring, weekday, includeInactive, sort } = queryOf(
            req,
            listActivitiesQuerySchema,
        );
        const admin = req.membership.hasRole(GroupRole.ADMIN);
        sendSuccess<ActivityListingDto[]>(
            res,
            await ActivityService.listForGroup(req.group, req.user, {
                label,
                recurring,
                weekday,
                includeInactive: admin && includeInactive === true,
                sort,
            }),
        );
    };

    create: Handler<BodyOf<typeof createActivitySchema>> = async (req, res) => {
        const {
            category,
            title,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            isRecurring,
            dateMode,
            specificDate,
            weekday,
            startTime,
            locationText,
            locationUrl,
            minPeople,
            maxPeople,
            costPerPerson,
            durationMinutes,
            externalUrl,
            preferredDayparts,
        } = req.body;
        const result = await ActivityService.create(req.group, req.user, {
            category,
            title,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            isRecurring,
            dateMode,
            specificDate,
            weekday,
            startTime,
            locationText,
            locationUrl,
            minPeople,
            maxPeople,
            costPerPerson,
            durationMinutes,
            externalUrl,
            preferredDayparts,
        });
        if (!result.ok) {
            sendValidationFailed(res, 'The date fields do not agree', { problem: result.problem });
            return;
        }
        await NotificationService.activityCreated(result.activity, req.group, req.user);
        sendSuccess<ActivityDetailDto>(res, ActivityService.detail(result.activity, req.user), 201);
    };

    detail: Handler = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(
            req.group,
            activityId,
            req.membership.hasRole(GroupRole.ADMIN),
        );
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        sendSuccess<ActivityDetailDto>(res, ActivityService.detail(activity, req.user));
    };

    update: Handler<BodyOf<typeof updateActivitySchema>> = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(
            req.group,
            activityId,
            req.membership.hasRole(GroupRole.ADMIN),
        );
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!ActivityService.canManage(activity, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin edits an activity');
            return;
        }
        const {
            category,
            title,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            isRecurring,
            dateMode,
            specificDate,
            weekday,
            startTime,
            locationText,
            locationUrl,
            minPeople,
            maxPeople,
            costPerPerson,
            durationMinutes,
            externalUrl,
            preferredDayparts,
        } = req.body;
        const result = await ActivityService.update(activity, {
            category,
            title,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            isRecurring,
            dateMode,
            specificDate,
            weekday,
            startTime,
            locationText,
            locationUrl,
            minPeople,
            maxPeople,
            costPerPerson,
            durationMinutes,
            externalUrl,
            preferredDayparts,
        });
        if (!result.ok) {
            sendValidationFailed(res, 'The date fields do not agree', { problem: result.problem });
            return;
        }
        sendSuccess<ActivityDetailDto>(res, ActivityService.detail(result.activity, req.user));
    };

    delete: Handler = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(
            req.group,
            activityId,
            req.membership.hasRole(GroupRole.ADMIN),
        );
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!ActivityService.canManage(activity, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin deletes an activity');
            return;
        }
        await ActivityService.delete(req.group, activity);
        sendNoContent(res);
    };

    /** Ranked dates for the planning dialog. Without `memberIds`, the people who are in. */
    suggestions: Handler = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const { memberIds, from, weeks } = queryOf(req, suggestionsQuerySchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, false);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        sendSuccess<SuggestionsResponse>(
            res,
            await SuggestionService.rank(
                req.group,
                activity,
                memberIds ?? activity.interests.map((interest) => interest.userId),
                from ?? today(),
                weeks,
            ),
        );
    };

    /** "I'm in." Saying it twice is fine. */
    markMeIn: Handler = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, false);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        await ActivityService.addInterest(activity, req.user.id, req.user);
        sendNoContent(res);
    };

    markMeOut: Handler = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, false);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        await ActivityService.removeInterest(activity, req.user.id);
        sendNoContent(res);
    };

    /** An admin marking somebody else in; the route guards the role. */
    markMemberIn: Handler = async (req, res) => {
        const { activityId, userId } = paramsOf(req, interestOfParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, true);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!(await GroupMember.existsBy({ groupId: req.group.id, userId }))) {
            sendNotFound(res, 'Member');
            return;
        }
        await ActivityService.addInterest(activity, userId, req.user);
        sendNoContent(res);
    };

    markMemberOut: Handler = async (req, res) => {
        const { activityId, userId } = paramsOf(req, interestOfParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, true);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        await ActivityService.removeInterest(activity, userId);
        sendNoContent(res);
    };
}
