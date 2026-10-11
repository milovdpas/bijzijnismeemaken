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
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import {
    createActivitySchema,
    interestOfParamSchema,
    listActivitiesQuerySchema,
    suggestionsQuerySchema,
    updateActivitySchema,
} from '../validators/activitySchemas';
import { today } from '../utils/Dates';

/**
 * Activities inside a group. `requireGroupRole` has loaded `req.group` and
 * `req.membership`, and on the routes of one activity `includeActivity` has
 * loaded `req.activity`: inactive ones (their creator left) exist only for
 * admins. Editing and deleting are the creator's or an admin's
 * (`requireActivityManager`).
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

    detail: Handler = (req, res) => {
        sendSuccess<ActivityDetailDto>(res, ActivityService.detail(req.activity, req.user));
    };

    update: Handler<BodyOf<typeof updateActivitySchema>> = async (req, res) => {
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
        const result = await ActivityService.update(req.activity, {
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
        await ActivityService.delete(req.group, req.activity);
        sendNoContent(res);
    };

    /** Ranked dates for the planning dialog. Without `memberIds`, the people who are in. */
    suggestions: Handler = async (req, res) => {
        const { memberIds, from, weeks } = queryOf(req, suggestionsQuerySchema);
        sendSuccess<SuggestionsResponse>(
            res,
            await SuggestionService.rank(
                req.group,
                req.activity,
                memberIds ?? req.activity.interests.map((interest) => interest.userId),
                from ?? today(),
                weeks,
            ),
        );
    };

    /** "I'm in." Saying it twice is fine. */
    markMeIn: Handler = async (req, res) => {
        await ActivityService.addInterest(req.activity, req.user.id, req.user);
        sendNoContent(res);
    };

    markMeOut: Handler = async (req, res) => {
        await ActivityService.removeInterest(req.activity, req.user.id);
        sendNoContent(res);
    };

    /** An admin marking somebody else in; the route guards the role. */
    markMemberIn: Handler = async (req, res) => {
        const { userId } = paramsOf(req, interestOfParamSchema);
        if (!(await GroupMember.existsBy({ groupId: req.group.id, userId }))) {
            sendNotFound(res, 'Member');
            return;
        }
        await ActivityService.addInterest(req.activity, userId, req.user);
        sendNoContent(res);
    };

    markMemberOut: Handler = async (req, res) => {
        const { userId } = paramsOf(req, interestOfParamSchema);
        await ActivityService.removeInterest(req.activity, userId);
        sendNoContent(res);
    };
}
