import type { Request } from 'express';

import { addressOf, rateLimit } from './RateLimit';

/**
 * The ceilings themselves, kept apart from the mechanism that enforces them.
 *
 * Each task that adds a route decides whether it needs one. The rule of thumb:
 * anything unauthenticated, and anything that spends a call on Google or Brevo,
 * gets a limiter; ordinary authenticated reads do not.
 */

const MINUTE = 60 * 1000;

/**
 * Unauthenticated routes in general: the Google redirect, refresh, logout,
 * invite link previews, the handle availability check.
 *
 * Keyed by address, generously, because an office behind one NAT might
 * legitimately hit these a few dozen times in an afternoon.
 */
export const publicLimit = rateLimit({
    name: 'public',
    limit: 60,
    windowMs: MINUTE,
    key: addressOf,
});

/** Registration costs an email (task 8b) and a database row. */
export const registerLimit = rateLimit({
    name: 'register',
    limit: 10,
    windowMs: 60 * MINUTE,
    key: addressOf,
});

/**
 * Anything that sends an email on request: resend verification, forgot
 * password. Tight, because each call costs a Brevo send and lands in somebody's
 * inbox, and nobody legitimately needs more than a few an hour.
 */
export const mailLimit = rateLimit({
    name: 'mail',
    limit: 5,
    windowMs: 60 * MINUTE,
    key: addressOf,
});

/**
 * Password guessing, from two directions.
 *
 * Per address, so one machine cannot try many passwords across many accounts;
 * and per email, so one account cannot be attacked from many addresses. The
 * email limit is the tighter one: a real person mistypes a password a few
 * times, never twenty.
 */
export const loginAddressLimit = rateLimit({
    name: 'login-address',
    limit: 30,
    windowMs: 15 * MINUTE,
    key: addressOf,
});

export const loginEmailLimit = rateLimit({
    name: 'login-email',
    limit: 8,
    windowMs: 15 * MINUTE,
    key: emailOf,
});

/** The validated body's email, which `validate()` has already lowercased. */
function emailOf(req: Request): string | null {
    const body = req.body as { email?: unknown } | undefined;
    return typeof body?.email === 'string' ? body.email : null;
}

/** A manual calendar sync spends a Google call per calendar: once every five minutes per person. */
export const calendarSyncLimit = rateLimit({
    name: 'calendar-sync',
    limit: 1,
    windowMs: 5 * MINUTE,
    key: (req: Request) => req.user.id,
});
