import { DateTime } from 'luxon';
import type { GroupOccurrenceDto, OccurrenceDto } from '@bzim/types';

import type { Handler } from '../../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { ActivityService } from '../services/ActivityService';
import { OccurrenceService } from '../services/OccurrenceService';
import {
    sendCalendar,
    sendConflict,
    sendForbidden,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import { icsFor } from '../utils/CalendarLinks';
import { verifyOccurrenceToken } from '../utils/SignedLink';
import { activityParamSchema } from '../validators/activitySchemas';
import { groupIdParamSchema } from '../validators/commonSchemas';
import {
    icsQuerySchema,
    occurrenceIdParamSchema,
    occurrenceParamSchema,
    planOccurrenceSchema,
    rangeQuerySchema,
    updateOccurrenceSchema,
} from '../validators/occurrenceSchemas';

/**
 * Planning an activity onto dates. The group-scoped handlers run behind
 * `requireGroupRole(MEMBER)` and check creator-or-admin themselves; the ICS
 * download is public, guarded by its signed token, because a calendar app
 * fetching it has no session.
 */
export default class OccurrenceController {
    plan: Handler<BodyOf<typeof planOccurrenceSchema>> = async (req, res) => {
        const { activityId } = paramsOf(req, activityParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, false);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!ActivityService.canManage(activity, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin plans an activity');
            return;
        }
        const { date, daypart, startTime, notes, participantIds } = req.body;
        const result = await OccurrenceService.plan(req.group, activity, req.user, {
            date,
            daypart,
            startTime,
            notes,
            participantIds,
        });
        if (!result.ok) {
            switch (result.problem) {
                case 'PARTICIPANT_NOT_MEMBER':
                    sendValidationFailed(res, 'Every participant must be a member', {
                        problem: result.problem,
                    });
                    return;
                case 'ALREADY_OPEN':
                    sendConflict(res, 'This activity is already planned', undefined, {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<OccurrenceDto>(res, result.occurrence.toDto(), 201);
    };

    update: Handler<BodyOf<typeof updateOccurrenceSchema>> = async (req, res) => {
        const { activityId, occurrenceId } = paramsOf(req, occurrenceParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, true);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!ActivityService.canManage(activity, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin changes a planned activity');
            return;
        }
        const occurrence = await OccurrenceService.findForActivity(activity, occurrenceId);
        if (occurrence === null) {
            sendNotFound(res, 'Occurrence');
            return;
        }
        const { date, daypart, startTime, notes, participantIds, status } = req.body;
        const result = await OccurrenceService.update(req.group, activity, occurrence, req.user, {
            date,
            daypart,
            startTime,
            notes,
            participantIds,
            status,
        });
        if (!result.ok) {
            sendValidationFailed(res, 'Every participant must be a member', {
                problem: result.problem,
            });
            return;
        }
        sendSuccess<OccurrenceDto>(res, result.occurrence.toDto());
    };

    delete: Handler = async (req, res) => {
        const { activityId, occurrenceId } = paramsOf(req, occurrenceParamSchema);
        const activity = await ActivityService.findForGroup(req.group, activityId, true);
        if (activity === null) {
            sendNotFound(res, 'Activity');
            return;
        }
        if (!ActivityService.canManage(activity, req.membership)) {
            sendForbidden(res, 'Only the creator or an admin removes a planned activity');
            return;
        }
        const occurrence = await OccurrenceService.findForActivity(activity, occurrenceId);
        if (occurrence === null) {
            sendNotFound(res, 'Occurrence');
            return;
        }
        await OccurrenceService.delete(req.group, activity, occurrence);
        sendNoContent(res);
    };

    /** The group's agenda for a date range. */
    listForGroup: Handler = async (req, res) => {
        paramsOf(req, groupIdParamSchema);
        const { from, to } = queryOf(req, rangeQuerySchema);
        sendSuccess<GroupOccurrenceDto[]>(
            res,
            await OccurrenceService.listForGroup(req.group, from, to),
        );
    };

    /** The calendar file behind the email button. A bad token is a 404, like an unknown id. */
    ics: Handler = async (req, res) => {
        const { occurrenceId } = paramsOf(req, occurrenceIdParamSchema);
        const { token } = queryOf(req, icsQuerySchema);
        const occurrence = await OccurrenceService.findWithActivity(occurrenceId);
        if (occurrence === null || !verifyOccurrenceToken(occurrenceId, token)) {
            sendNotFound(res, 'Occurrence');
            return;
        }
        const event = OccurrenceService.calendarEvent(occurrence.activity, occurrence);
        sendCalendar(
            res,
            `${occurrence.date}-${occurrence.activity.id}.ics`,
            icsFor(event, DateTime.utc()),
        );
    };
}
