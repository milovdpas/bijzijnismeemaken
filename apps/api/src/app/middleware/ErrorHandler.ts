import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '@bzim/types';

import { env } from '../../config/app';
import { sendError } from '../utils/ApiResponses';

/**
 * The last resort, and deliberately not the usual path.
 *
 * Refusals are answered where they happen: middleware writes its own 401 and
 * 422, and services return outcomes that controllers render. What reaches here
 * is either a fault in the code or an upstream that failed, so there is nothing
 * useful to tell the caller beyond the fact that it did.
 *
 * The message is generic on purpose. An unexpected error's text can carry a
 * query, a path or a key, and none of that belongs in a response. The detail
 * goes to the log, where it is useful and not public.
 */
export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (res.headersSent) {
        next(error);
        return;
    }

    // A body the JSON parser could not read, or one over the size limit. The
    // parser throws rather than answering, so it lands here; it is the
    // caller's mistake, not ours, and a 500 would page the wrong person.
    const parse = bodyParserFailure(error);
    if (parse !== null) {
        sendError(res, ERROR_CODES.VALIDATION_FAILED, parse.message, parse.status);
        return;
    }

    // The route, so the line can be matched to a feature; the path holds ids,
    // never a token or an address, so it is safe to name.
    console.error(`Unhandled error on ${req.method} ${req.path}:`, error);
    sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        'Something went wrong.',
        500,
        // Detail only outside production, where the audience is the developer
        // who caused it.
        env.isProduction() ? undefined : String(error),
    );
}

/**
 * Recognises the errors `express.json()` throws for a bad request body.
 *
 * body-parser tags them with a `type` (`entity.parse.failed`,
 * `entity.too.large`, ...) and a 4xx `status`. Anything with a 4xx status and
 * such a type is answered with that status and a message safe to show: the
 * parser's own text names the byte that failed, which is fine for a developer
 * and useless to anyone else, so a fixed sentence is used instead.
 */
function bodyParserFailure(error: unknown): { status: number; message: string } | null {
    if (typeof error !== 'object' || error === null) {
        return null;
    }
    const { status, type } = error as { status?: unknown; type?: unknown };
    if (typeof status !== 'number' || status < 400 || status >= 500 || typeof type !== 'string') {
        return null;
    }
    if (
        !type.startsWith('entity.') &&
        !type.startsWith('encoding.') &&
        !type.startsWith('charset.')
    ) {
        return null;
    }
    return {
        status,
        message: status === 413 ? 'Request body is too large.' : 'Request body is not valid JSON.',
    };
}
