import type { NextFunction, Request, Response } from 'express';

import { env } from '../../../config/app';
import { sendForbidden } from '../utils/ApiResponses';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOf } from '../utils/Cookies';
import { bearerOf } from './UserAuth';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The second line against cross-site requests, after `SameSite=Lax`.
 *
 * A browser attaches the session cookies to any request it makes to this
 * host, including one started by a page on another site. Lax already drops
 * them from cross-site POSTs; this refuses the request outright if the
 * `Origin` (or, failing that, the `Referer`) is not the app. It only applies
 * where a cookie is doing the authenticating: a bearer header was set on
 * purpose by a tool, and the worker endpoints are called by the scheduler,
 * which sends neither.
 */
export function originCheck(req: Request, res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method) || req.path.startsWith('/api/v1/worker/')) {
        next();
        return;
    }

    const viaCookie =
        cookieOf(req, ACCESS_COOKIE) !== undefined || cookieOf(req, REFRESH_COOKIE) !== undefined;
    if (!viaCookie || bearerOf(req) !== undefined) {
        next();
        return;
    }

    const origin = req.header('origin') ?? originOf(req.header('referer'));
    if (origin !== env.appUrl) {
        sendForbidden(res, 'Cross-site request refused');
        return;
    }

    next();
}

function originOf(referer: string | undefined): string | undefined {
    if (referer === undefined) {
        return undefined;
    }
    try {
        return new URL(referer).origin;
    } catch {
        return undefined;
    }
}
