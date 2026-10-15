import type {
    GroupAvailabilityResponse,
    MyAvailabilityResponse,
    UnavailabilityDto,
    UnavailabilityRuleDto,
} from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import Activity from '../../domain/models/Activity.entity';
import { AvailabilityService } from '../../domain/services/AvailabilityService';
import { UnavailabilityService } from '../../domain/services/UnavailabilityService';
import { sendNoContent, sendNotFound, sendSuccess } from '../utils/ApiResponses';
import {
    createRuleSchema,
    groupAvailabilityQuerySchema,
    ruleIdParamSchema,
    unavailabilitySchema,
    updateRuleSchema,
} from '../validators/availabilitySchemas';
import { rangeQuerySchema } from '../validators/commonSchemas';

/**
 * Availability as computed, and the two things a person can say about their
 * own: one-off blocks and weekly rules. Everything under `/me` is the
 * caller's; the group matrix runs behind `requireGroupRole(MEMBER)`.
 */
export default class AvailabilityController {
    mine: Handler = async (req, res) => {
        const { from, to } = queryOf(req, rangeQuerySchema);
        sendSuccess<MyAvailabilityResponse>(
            res,
            await AvailabilityService.forUser(req.user, from, to),
        );
    };

    /** With `activityId`, only the people in for that activity of this group. */
    group: Handler = async (req, res) => {
        const { from, to, activityId } = queryOf(req, groupAvailabilityQuerySchema);
        if (
            activityId !== undefined &&
            !(await Activity.existsBy({ id: activityId, groupId: req.group.id }))
        ) {
            sendNotFound(res, 'Activity');
            return;
        }
        sendSuccess<GroupAvailabilityResponse>(
            res,
            await AvailabilityService.forGroup(req.group, from, to, activityId ?? null),
        );
    };

    listBlocks: Handler = async (req, res) => {
        const { from, to } = queryOf(req, rangeQuerySchema);
        const blocks = await UnavailabilityService.listBlocks(req.user, from, to);
        sendSuccess<UnavailabilityDto[]>(
            res,
            blocks.map((block) => block.toDto()),
        );
    };

    addBlock: Handler<BodyOf<typeof unavailabilitySchema>> = async (req, res) => {
        const { date, daypart, free } = req.body;
        await UnavailabilityService.addBlock(req.user, date, daypart, free ?? false);
        sendNoContent(res);
    };

    removeBlock: Handler<BodyOf<typeof unavailabilitySchema>> = async (req, res) => {
        const { date, daypart } = req.body;
        await UnavailabilityService.removeBlock(req.user, date, daypart);
        sendNoContent(res);
    };

    listRules: Handler = async (req, res) => {
        const rules = await UnavailabilityService.listRules(req.user);
        sendSuccess<UnavailabilityRuleDto[]>(
            res,
            rules.map((rule) => rule.toDto()),
        );
    };

    createRule: Handler<BodyOf<typeof createRuleSchema>> = async (req, res) => {
        const { weekday, daypart, validFrom, validUntil } = req.body;
        const rule = await UnavailabilityService.createRule(req.user, {
            weekday,
            daypart,
            validFrom,
            validUntil,
        });
        sendSuccess<UnavailabilityRuleDto>(res, rule.toDto(), 201);
    };

    updateRule: Handler<BodyOf<typeof updateRuleSchema>> = async (req, res) => {
        const { ruleId } = paramsOf(req, ruleIdParamSchema);
        const rule = await UnavailabilityService.findRule(req.user, ruleId);
        if (rule === null) {
            sendNotFound(res, 'Rule');
            return;
        }
        const { weekday, daypart, validFrom, validUntil } = req.body;
        const updated = await UnavailabilityService.updateRule(rule, {
            weekday,
            daypart,
            validFrom,
            validUntil,
        });
        sendSuccess<UnavailabilityRuleDto>(res, updated.toDto());
    };

    deleteRule: Handler = async (req, res) => {
        const { ruleId } = paramsOf(req, ruleIdParamSchema);
        const rule = await UnavailabilityService.findRule(req.user, ruleId);
        if (rule === null) {
            sendNotFound(res, 'Rule');
            return;
        }
        await UnavailabilityService.deleteRule(rule);
        sendNoContent(res);
    };
}
