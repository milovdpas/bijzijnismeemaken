import { ERROR_CODES, Locale } from '@bzim/types';

import { env } from '../../config/app';
import type { Handler } from '../../interfaces/IHttp';
import { queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import { AuthService, safeReturnTo } from '../services/AuthService';
import { SessionService } from '../services/SessionService';
import { sendConflict, sendError, sendUnauthenticated } from '../utils/ApiResponses';
import { REFRESH_COOKIE, clearAuthCookies, cookieOf, setAuthCookies } from '../utils/Cookies';
import {
    googleCallbackQuerySchema,
    googleStartQuerySchema,
    loginSchema,
    registerSchema,
} from '../validators/authSchemas';

/**
 * Sign-in, by Google or by password, and the session endpoints.
 *
 * Both sign-in methods end the same way: `SessionService.issue` and the same
 * two cookies. Google answers with redirects because the browser arrives by
 * navigation; the password endpoints answer JSON because a form posted them.
 */
export default class AuthController {
    private readonly auth = new AuthService();
    private readonly sessions = new SessionService();

    googleStart: Handler = async (req, res) => {
        const { returnTo } = queryOf(req, googleStartQuerySchema);
        const url = await this.auth.startGoogleLogin(safeReturnTo(returnTo));
        res.redirect(302, url);
    };

    /**
     * Every failure goes back to the login page with a reason in the query,
     * because there is no JSON client on the other end of a redirect, only a
     * person who needs to see why.
     */
    googleCallback: Handler = async (req, res) => {
        const { state, code, error } = queryOf(req, googleCallbackQuerySchema);
        if (error !== undefined || code === undefined) {
            res.redirect(302, `${env.appUrl}/login?error=google_cancelled`);
            return;
        }

        const result = await this.auth.completeGoogleLogin(state, code);
        if (!result.ok) {
            const reason = result.problem === 'STATE_INVALID' ? 'google_state' : 'google_failed';
            res.redirect(302, `${env.appUrl}/login?error=${reason}`);
            return;
        }

        const session = await this.sessions.issue(result.user, req.header('user-agent') ?? null);
        setAuthCookies(res, session);
        const target = result.user.onboardingDone()
            ? (result.returnTo ?? '/groups')
            : '/onboarding';
        res.redirect(302, `${env.appUrl}${target}`);
    };

    register: Handler<BodyOf<typeof registerSchema>> = async (req, res) => {
        const { email, password, locale } = req.body;
        const result = await this.auth.register(email, password, locale ?? Locale.NL);
        if (!result.ok) {
            sendConflict(res, 'That email already has an account');
            return;
        }
        // No session yet: the address has to be verified first (task 8b sends
        // the link). 201 with an empty body says "created, now check your mail".
        res.status(201).end();
    };

    login: Handler<BodyOf<typeof loginSchema>> = async (req, res) => {
        const { email, password } = req.body;
        const result = await this.auth.login(email, password);
        if (!result.ok) {
            const code =
                result.problem === 'EMAIL_NOT_VERIFIED'
                    ? ERROR_CODES.EMAIL_NOT_VERIFIED
                    : ERROR_CODES.INVALID_CREDENTIALS;
            sendError(res, code, 'Could not sign in', 401);
            return;
        }

        const session = await this.sessions.issue(result.user, req.header('user-agent') ?? null);
        setAuthCookies(res, session);
        res.status(204).end();
    };

    /**
     * Rotates the pair. Every failure clears both cookies: a browser holding a
     * refresh token that was refused has nothing left worth keeping, and
     * clearing it stops the client retrying a dead session.
     */
    refresh: Handler = async (req, res) => {
        const token = cookieOf(req, REFRESH_COOKIE);
        if (token === undefined) {
            sendUnauthenticated(res);
            return;
        }

        const result = await this.sessions.refresh(token, req.header('user-agent') ?? null);
        if (!result.ok) {
            clearAuthCookies(res);
            sendUnauthenticated(res);
            return;
        }

        setAuthCookies(res, result.session);
        res.status(204).end();
    };

    /** Idempotent: a missing or unknown cookie still answers 204 and clears. */
    logout: Handler = async (req, res) => {
        const token = cookieOf(req, REFRESH_COOKIE);
        if (token !== undefined) {
            await this.sessions.revoke(token);
        }
        clearAuthCookies(res);
        res.status(204).end();
    };
}
