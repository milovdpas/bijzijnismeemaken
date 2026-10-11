import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@bzim/types';

import { sendError } from '../utils/ApiResponses';

/**
 * Refuses a signed-in person who has not finished their profile. Runs after
 * `userAuth`, on anything that would make them visible to a group: creating
 * or joining one. Reading their own account and finishing onboarding stay open.
 */
export function requireOnboarded(req: Request, res: Response, next: NextFunction): void {
    if (!req.user.onboardingDone()) {
        sendError(res, ERROR_CODES.ONBOARDING_REQUIRED, 'Finish onboarding first', 403);
        return;
    }
    next();
}
