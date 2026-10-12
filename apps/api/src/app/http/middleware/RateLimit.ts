import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ERROR_CODES } from '@bzim/types';

import { sendError } from '../utils/ApiResponses';

/**
 * A ceiling on how often one caller may ask.
 *
 * **In memory, deliberately.** A second API instance counts separately, so the
 * effective ceiling is per instance rather than global. That is the wrong shape
 * for enforcement and the right shape for this: the deployment runs one
 * container, and the alternative is a write to MySQL on every request to protect
 * against requests. If this ever runs behind more than one instance, the limits
 * in `ApiLimits.ts` are a floor rather than a promise.
 *
 * Fixed windows rather than a sliding log. A caller can send twice the limit
 * across a window boundary, which for these numbers is a rounding error, and a
 * sliding log would keep a timestamp per request for every caller in order to
 * say the same thing.
 */

/** One caller's usage of one limiter. */
interface Window {
    /** When the current window ends, in epoch milliseconds. */
    resetAt: number;
    count: number;
}

export interface RateLimitOptions {
    /** Requests allowed per window. */
    limit: number;
    windowMs: number;
    /**
     * Who is being limited. Returning null exempts the request, which is how a
     * limiter keyed on a user skips anything that never reached `userAuth`.
     */
    key: (req: Request) => string | null;
    /** Named in the log line, so a tripped limit says which one. */
    name: string;
}

/**
 * Callers are pruned lazily, never on a timer.
 *
 * A timer would be a second thing to shut down cleanly. A caller's own entry is
 * checked for expiry on the request that touches it, and callers who never come
 * back are reclaimed by a sweep that runs only once the map has grown past
 * {@link SWEEP_THRESHOLD}, then not again until it has doubled.
 */
const buckets = new Map<string, Map<string, Window>>();

/**
 * How many callers one limiter tracks before a sweep is worth doing.
 *
 * Far above anything this deployment sees, so in practice the sweep never runs
 * and the map holds a handful of entries. It exists so that the cost of an
 * unauthenticated route cannot be made to grow by whoever calls it.
 */
const SWEEP_THRESHOLD = 1024;

export function rateLimit(options: RateLimitOptions): RequestHandler {
    const windows = new Map<string, Window>();
    buckets.set(options.name, windows);

    /**
     * The size at which a full sweep is worth its cost, doubling after each one.
     *
     * Doubling means a sweep happens once per n/2 new callers rather than once
     * per request, so the amortised cost is constant and the map stays bounded
     * by roughly twice what is genuinely live.
     */
    let sweepAbove = SWEEP_THRESHOLD;

    return (req: Request, res: Response, next: NextFunction) => {
        const key = options.key(req);
        if (key === null) {
            next();
            return;
        }

        // Monotonic milliseconds: a clock adjustment must not open or close a window.
        const now = Number(process.hrtime.bigint() / 1_000_000n);
        if (windows.size > sweepAbove) {
            prune(windows, now);
            sweepAbove = Math.max(SWEEP_THRESHOLD, windows.size * 2);
        }

        // This caller's own entry is always checked for expiry below, so the
        // sweep above is only ever about reclaiming callers who never came back.
        const existing = windows.get(key);
        const window: Window =
            existing === undefined || existing.resetAt <= now
                ? { resetAt: now + options.windowMs, count: 0 }
                : existing;

        window.count += 1;
        windows.set(key, window);

        if (window.count > options.limit) {
            const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
            // Warned rather than silent. A limit tripping in normal use means
            // the limit is wrong, and that is only visible if it says so.
            console.warn(
                `Rate limit "${options.name}" tripped: ${String(window.count)} requests ` +
                    `against a ceiling of ${String(options.limit)}. Retry in ${String(retryAfter)}s.`,
            );
            res.setHeader('Retry-After', String(retryAfter));
            // In the body too: the browser client reads bodies, not headers, and a
            // screen can then say how long to wait.
            sendError(res, ERROR_CODES.RATE_LIMITED, 'Too many requests. Try again shortly.', 429, {
                retryAfterSeconds: retryAfter,
            });
            return;
        }

        next();
    };
}

/** Only for tests, which would otherwise inherit each other's counts. */
export function resetRateLimits(): void {
    for (const windows of buckets.values()) {
        windows.clear();
    }
}

function prune(windows: Map<string, Window>, now: number): void {
    for (const [key, window] of windows) {
        if (window.resetAt <= now) {
            windows.delete(key);
        }
    }
}

/**
 * The caller's address, for limiters that run before there is a user.
 *
 * **This is only as trustworthy as `TRUST_PROXY_HOPS` is correct.** `req.ip` is
 * the real client when Express has been told exactly how many proxies sit in
 * front, and something else entirely when it has not. Too high and a caller
 * chooses their own key by sending an `X-Forwarded-For` header, which makes the
 * limit decorative. Too low and everybody behind the proxy shares one bucket,
 * which makes it an outage.
 */
export function addressOf(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
