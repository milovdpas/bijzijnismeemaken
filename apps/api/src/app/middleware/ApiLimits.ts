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
 * Unauthenticated routes: the login redirect, invite link previews, the handle
 * availability check.
 *
 * Keyed by address, generously, because an office behind one NAT might
 * legitimately hit these a few dozen times in an afternoon. Sixty a minute is
 * far above that and far below useful for anyone enumerating handles or invite
 * tokens.
 */
export const publicLimit = rateLimit({
    name: 'public',
    limit: 60,
    windowMs: MINUTE,
    key: addressOf,
});
