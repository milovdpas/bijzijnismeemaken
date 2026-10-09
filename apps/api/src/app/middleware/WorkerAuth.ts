import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@bzim/types';

import { env } from '../../config/app';
import { sendError } from '../utils/ApiResponses';

/**
 * Guards the worker endpoints, which are called by the scheduler and by nobody
 * else.
 *
 * User tokens are wrong here: a cron job belongs to no user, and handing the
 * scheduler a user's credential would let a stolen cookie drive the jobs for
 * everyone. This is a separate shared secret, set once in the deployment's
 * environment.
 *
 * **An unset token closes the routes rather than opening them.** The endpoints
 * sit on a public domain behind the same proxy as everything else, so treating
 * "not configured" as "no check needed" would leave a stranger able to run our
 * cron jobs in a loop. Refusing instead means a misconfigured deployment stops
 * syncing and says so in the scheduler's log, which is visible, where the other
 * failure is not.
 */
export function workerAuth(req: Request, res: Response, next: NextFunction): void {
    const expected = env.workerToken;
    if (expected === '') {
        sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'WORKER_TOKEN is not configured, so worker jobs cannot run.',
            503,
        );
        return;
    }

    const provided = req.header('x-worker-token') ?? '';
    if (!matches(provided, expected)) {
        sendError(res, ERROR_CODES.UNAUTHENTICATED, 'Missing or invalid worker token', 401);
        return;
    }

    next();
}

/**
 * Constant time for equal lengths, and length is compared first.
 *
 * `timingSafeEqual` throws on a length mismatch, so that case has to be handled
 * anyway. Leaking the length of a secret that is generated once and never typed
 * is not worth padding around.
 */
function matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}
