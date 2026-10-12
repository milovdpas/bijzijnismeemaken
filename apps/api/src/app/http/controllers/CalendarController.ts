import type {
    CalendarConnectionDto,
    CalendarEventDto,
    CalendarFeedDto,
    CalendarIgnoreRuleDto,
    CalendarSourceDto,
} from '@bzim/types';

import { env } from '../../../config/app';
import type { Handler } from '../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { CalendarEventService } from '../../domain/services/CalendarEventService';
import { CalendarFeedService } from '../../domain/services/CalendarFeedService';
import { CalendarService } from '../../domain/services/CalendarService';
import { CalendarSyncService } from '../../domain/services/CalendarSyncService';
import { CalendarWriteService } from '../../domain/services/CalendarWriteService';
import { safeReturnTo } from '../../domain/services/AuthService';
import { IgnoreRuleService } from '../../domain/services/IgnoreRuleService';
import {
    sendConflict,
    sendNoContent,
    sendNotFound,
    sendSuccess,
    sendValidationFailed,
} from '../utils/ApiResponses';
import {
    addCalendarFeedSchema,
    calendarCallbackQuerySchema,
    calendarConnectQuerySchema,
    calendarSourceParamSchema,
    ignoreRuleParamSchema,
    ignoreRuleSchema,
    updateCalendarSourceSchema,
} from '../validators/calendarSchemas';
import { rangeQuerySchema } from '../validators/commonSchemas';

/**
 * A person's own calendar: the Google connection, its calendars, a manual
 * sync, the calendar links (Apple, Outlook), the synced events with titles
 * (for the ignore rules) and those rules. Everything here is the signed-in
 * person's; nothing takes a user id. `includeCalendarFeed` loads a link.
 */
export default class CalendarController {
    status: Handler = async (req, res) => {
        const connection = await CalendarService.find(req.user);
        sendSuccess<CalendarConnectionDto | null>(res, connection?.toDto() ?? null);
    };

    connect: Handler = async (req, res) => {
        const { scope, returnTo } = queryOf(req, calendarConnectQuerySchema);
        res.redirect(
            302,
            await CalendarService.startConnect(req.user, scope, safeReturnTo(returnTo)),
        );
    };

    /**
     * A redirect either way. A refusal lands on the calendar settings, which
     * read `error` from the query; a connection lands where the connect asked
     * (onboarding goes on to its next step), or on the settings with `connected`.
     */
    callback: Handler = async (req, res) => {
        const { state, code, error } = queryOf(req, calendarCallbackQuerySchema);
        if (error !== undefined || code === undefined) {
            res.redirect(302, `${env.appUrl}/settings/calendar?error=cancelled`);
            return;
        }
        const result = await CalendarService.completeConnect(req.user, state, code);
        if (!result.ok) {
            const reason = result.problem === 'STATE_INVALID' ? 'state' : 'provider';
            res.redirect(302, `${env.appUrl}/settings/calendar?error=${reason}`);
            return;
        }
        // Synced straight away, so the calendar counts on the page this lands on
        // rather than after the nightly run. A failure is kept on the connection.
        await CalendarSyncService.syncConnection(result.connection);
        if (result.autoAddEnabled) {
            await CalendarWriteService.backfill(req.user);
        }
        res.redirect(302, `${env.appUrl}${result.returnTo ?? '/settings/calendar?connected=1'}`);
    };

    disconnect: Handler = async (req, res) => {
        const connection = await CalendarService.find(req.user);
        if (connection === null) {
            sendNotFound(res, 'Calendar connection');
            return;
        }
        await CalendarService.disconnect(connection);
        sendNoContent(res);
    };

    updateSource: Handler<BodyOf<typeof updateCalendarSourceSchema>> = async (req, res) => {
        const { sourceId } = paramsOf(req, calendarSourceParamSchema);
        const connection = await CalendarService.find(req.user);
        if (connection === null) {
            sendNotFound(res, 'Calendar connection');
            return;
        }
        const { enabled } = req.body;
        const source = await CalendarService.setSourceEnabled(connection, sourceId, enabled);
        if (source === null) {
            sendNotFound(res, 'Calendar');
            return;
        }
        // A calendar switched on counts at once; one switched off lost its events already.
        if (enabled) {
            await CalendarSyncService.syncConnection(await CalendarService.reload(connection.id));
        }
        sendSuccess<CalendarSourceDto>(res, source.toDto());
    };

    /** Sync now, rate-limited by the route; answers with the connection as it is afterwards. */
    sync: Handler = async (req, res) => {
        const connection = await CalendarService.find(req.user);
        if (connection === null) {
            sendNotFound(res, 'Calendar connection');
            return;
        }
        await CalendarSyncService.syncConnection(connection);
        sendSuccess<CalendarConnectionDto>(
            res,
            (await CalendarService.reload(connection.id)).toDto(),
        );
    };

    feeds: Handler = async (req, res) => {
        sendSuccess<CalendarFeedDto[]>(
            res,
            (await CalendarFeedService.list(req.user)).map((feed) => feed.toDto()),
        );
    };

    /** Read once on the spot: a link that cannot be read is refused with the reason, not kept. */
    addFeed: Handler<BodyOf<typeof addCalendarFeedSchema>> = async (req, res) => {
        const { url, name } = req.body;
        const result = await CalendarFeedService.add(req.user, url, name);
        if (!result.ok) {
            switch (result.problem) {
                case 'ALREADY_ADDED':
                    sendConflict(res, 'That calendar link is added already', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'TOO_MANY':
                    sendConflict(res, 'No room for another calendar link', undefined, {
                        problem: result.problem,
                    });
                    return;
                case 'INVALID_URL':
                case 'UNREACHABLE':
                case 'GONE':
                case 'NOT_A_CALENDAR':
                case 'TOO_LARGE':
                    sendValidationFailed(res, 'That calendar link cannot be read', {
                        problem: result.problem,
                    });
                    return;
            }
        }
        sendSuccess<CalendarFeedDto>(res, result.feed.toDto(), 201);
    };

    /** Sync now for the links, rate-limited by the route; answers with all of them afterwards. */
    syncFeeds: Handler = async (req, res) => {
        sendSuccess<CalendarFeedDto[]>(
            res,
            (await CalendarFeedService.syncAllFor(req.user)).map((feed) => feed.toDto()),
        );
    };

    removeFeed: Handler = async (req, res) => {
        await CalendarFeedService.remove(req.calendarFeed);
        sendNoContent(res);
    };

    events: Handler = async (req, res) => {
        const { from, to } = queryOf(req, rangeQuerySchema);
        sendSuccess<CalendarEventDto[]>(
            res,
            (await CalendarEventService.listOwn(req.user, from, to)).map((event) => event.toDto()),
        );
    };

    ignoreRules: Handler = async (req, res) => {
        sendSuccess<CalendarIgnoreRuleDto[]>(
            res,
            (await IgnoreRuleService.list(req.user)).map((rule) => rule.toDto()),
        );
    };

    addIgnoreRule: Handler<BodyOf<typeof ignoreRuleSchema>> = async (req, res) => {
        const { kind, value, label } = req.body;
        const result = await IgnoreRuleService.add(req.user, kind, value, label);
        sendSuccess<CalendarIgnoreRuleDto>(res, result.rule.toDto(), result.created ? 201 : 200);
    };

    removeIgnoreRule: Handler = async (req, res) => {
        const { ruleId } = paramsOf(req, ignoreRuleParamSchema);
        if (!(await IgnoreRuleService.remove(req.user, ruleId))) {
            sendNotFound(res, 'Ignore rule');
            return;
        }
        sendNoContent(res);
    };
}
