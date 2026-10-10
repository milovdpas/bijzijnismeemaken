import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import CalendarController from '../../controllers/CalendarController';
import { calendarSyncLimit, publicLimit } from '../../middleware/ApiLimits';
import { userAuth } from '../../middleware/UserAuth';
import { validate } from '../../middleware/ValidateRequest';
import {
    calendarCallbackQuerySchema,
    calendarConnectQuerySchema,
    calendarSourceParamSchema,
    ignoreRuleParamSchema,
    ignoreRuleSchema,
    updateCalendarSourceSchema,
} from '../../validators/calendarSchemas';
import { rangeQuerySchema } from '../../validators/commonSchemas';

/**
 * `/me/calendar/*` and the provider callback. The callback is behind
 * `userAuth` too: the browser arrives with the session cookie, and the
 * state row must belong to that very person (docs/02 §2.6).
 */
export default class CalendarRoutes implements IRoute {
    private readonly controller = new CalendarController();

    getRoutes(): Router {
        const router = Router();

        router.get(API_ENDPOINTS.ME.CALENDAR, userAuth, this.controller.status);
        router.get(
            API_ENDPOINTS.ME.CALENDAR_CONNECT,
            userAuth,
            publicLimit,
            validate({ query: calendarConnectQuerySchema }),
            this.controller.connect,
        );
        router.get(
            API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK,
            userAuth,
            publicLimit,
            validate({ query: calendarCallbackQuerySchema }),
            this.controller.callback,
        );
        router.delete(API_ENDPOINTS.ME.CALENDAR, userAuth, this.controller.disconnect);
        router.patch(
            API_ENDPOINTS.ME.CALENDAR_SOURCE(':sourceId'),
            userAuth,
            validate({ params: calendarSourceParamSchema, body: updateCalendarSourceSchema }),
            this.controller.updateSource,
        );
        router.post(
            API_ENDPOINTS.ME.CALENDAR_SYNC,
            userAuth,
            calendarSyncLimit,
            this.controller.sync,
        );
        router.get(
            API_ENDPOINTS.ME.CALENDAR_EVENTS,
            userAuth,
            validate({ query: rangeQuerySchema }),
            this.controller.events,
        );
        router.get(API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES, userAuth, this.controller.ignoreRules);
        router.post(
            API_ENDPOINTS.ME.CALENDAR_IGNORE_RULES,
            userAuth,
            validate({ body: ignoreRuleSchema }),
            this.controller.addIgnoreRule,
        );
        router.delete(
            API_ENDPOINTS.ME.CALENDAR_IGNORE_RULE(':ruleId'),
            userAuth,
            validate({ params: ignoreRuleParamSchema }),
            this.controller.removeIgnoreRule,
        );

        return router;
    }
}
