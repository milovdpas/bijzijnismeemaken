import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type CalendarFeed from '../../domain/models/CalendarFeed.entity';
import { CalendarFeedService } from '../../domain/services/CalendarFeedService';
import { sendNotFound } from '../utils/ApiResponses';
import { calendarFeedParamSchema } from '../validators/calendarSchemas';
import { paramsOf } from './ValidateRequest';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link includeCalendarFeed}: the caller's own calendar link in the path. */
            calendarFeed: CalendarFeed;
        }
    }
}

/**
 * Loads the calendar link in `:feedId`, looked up among the caller's own,
 * so somebody else's is as unknown as a missing one. Runs after `userAuth`.
 */
export const includeCalendarFeed: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { feedId } = paramsOf(req, calendarFeedParamSchema);
    const feed = await CalendarFeedService.findOwn(req.user, feedId);
    if (feed === null) {
        sendNotFound(res, 'Calendar link');
        return;
    }
    req.calendarFeed = feed;
    next();
};
