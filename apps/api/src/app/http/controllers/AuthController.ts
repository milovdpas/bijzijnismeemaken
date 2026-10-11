import type { Request, Response } from 'express';
import { ERROR_CODES, Locale } from '@bzim/types';

import { env } from '../../../config/app';
import type { Handler } from '../interfaces/IHttp';
import { queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import type User from '../../domain/models/User.entity';
import { AuthService, safeReturnTo } from '../../domain/services/AuthService';
import { SessionService } from '../../domain/services/SessionService';
import { sendConflict, sendError, sendNoContent, sendUnauthenticated } from '../utils/ApiResponses';
import {
    OAUTH_COOKIE,
    REFRESH_COOKIE,
    clearAuthCookies,
    clearOAuthCookie,
    cookieOf,
    setAuthCookies,
    setOAuthCookie,
} from '../utils/Cookies';
import {
    emailOnlySchema,
    googleCallbackQuerySchema,
    googleStartQuerySchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    verifyEmailSchema,
} from '../validators/authSchemas';

/**
 * Sign-in, by Google or by password, the emailed links, and the session
 * endpoints.
 *
 * Every sign-in ends the same way: `SessionService.issue` and the same two
 * cookies. Google answers with redirects because the browser arrives by
 * navigation; everything else answers JSON because the web app called it.
 */
export default class AuthController {
    googleStart: Handler = async (req, res) => {
        const { returnTo } = queryOf(req, googleStartQuerySchema);
        const { url, state } = await AuthService.startGoogleLogin(safeReturnTo(returnTo));
        setOAuthCookie(res, state);
        res.redirect(302, url);
    };

    /**
     * Every failure goes back to the login page with a reason in the query,
     * because there is no JSON client on the other end of a redirect, only a
     * person who needs to see why.
     */
    googleCallback: Handler = async (req, res) => {
        const { state, code, error } = queryOf(req, googleCallbackQuerySchema);
        const started = cookieOf(req, OAUTH_COOKIE);
        clearOAuthCookie(res);
        if (error !== undefined || code === undefined) {
            res.redirect(302, `${env.appUrl}/login?error=google_cancelled`);
            return;
        }
        // A callback URL carried over from another browser would sign this one
        // into somebody else's account; the state has to match the one this
        // browser was given when it started.
        if (started !== state) {
            res.redirect(302, `${env.appUrl}/login?error=google_state`);
            return;
        }

        const result = await AuthService.completeGoogleLogin(state, code);
        if (!result.ok) {
            const reason = result.problem === 'STATE_INVALID' ? 'google_state' : 'google_failed';
            res.redirect(302, `${env.appUrl}/login?error=${reason}`);
            return;
        }

        await AuthController.signIn(req, res, result.user);
        const target = result.user.onboardingDone()
            ? (result.returnTo ?? '/groups')
            : '/onboarding';
        res.redirect(302, `${env.appUrl}${target}`);
    };

    register: Handler<BodyOf<typeof registerSchema>> = async (req, res) => {
        const { email, password, locale } = req.body;
        const result = await AuthService.register(email, password, locale ?? Locale.NL);
        if (!result.ok) {
            sendConflict(res, 'That email already has an account');
            return;
        }
        // No session yet: the address has to be verified first. 201 with an
        // empty body says "created, now check your mail".
        sendNoContent(res, 201);
    };

    login: Handler<BodyOf<typeof loginSchema>> = async (req, res) => {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        if (!result.ok) {
            const code =
                result.problem === 'EMAIL_NOT_VERIFIED'
                    ? ERROR_CODES.EMAIL_NOT_VERIFIED
                    : ERROR_CODES.INVALID_CREDENTIALS;
            sendError(res, code, 'Could not sign in', 401);
            return;
        }

        await AuthController.signIn(req, res, result.user);
        sendNoContent(res);
    };

    /** Always 204: whether the address exists is not for the caller to learn. */
    resendVerification: Handler<BodyOf<typeof emailOnlySchema>> = async (req, res) => {
        await AuthService.resendVerification(req.body.email);
        sendNoContent(res);
    };

    /** The link signs the person in, so onboarding can start right away. */
    verifyEmail: Handler<BodyOf<typeof verifyEmailSchema>> = async (req, res) => {
        const result = await AuthService.verifyEmail(req.body.token);
        if (!result.ok) {
            sendError(res, ERROR_CODES.TOKEN_INVALID, 'This link is no longer valid', 400);
            return;
        }
        await AuthController.signIn(req, res, result.user);
        sendNoContent(res);
    };

    forgotPassword: Handler<BodyOf<typeof emailOnlySchema>> = async (req, res) => {
        await AuthService.forgotPassword(req.body.email);
        sendNoContent(res);
    };

    /** No session afterwards, on purpose: every session was just revoked, including any on this device. */
    resetPassword: Handler<BodyOf<typeof resetPasswordSchema>> = async (req, res) => {
        const { token, password } = req.body;
        const result = await AuthService.resetPassword(token, password);
        if (!result.ok) {
            sendError(res, ERROR_CODES.TOKEN_INVALID, 'This link is no longer valid', 400);
            return;
        }
        clearAuthCookies(res);
        sendNoContent(res);
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

        const result = await SessionService.refresh(token, req.header('user-agent') ?? null);
        if (!result.ok) {
            clearAuthCookies(res);
            sendUnauthenticated(res);
            return;
        }

        setAuthCookies(res, result.session);
        sendNoContent(res);
    };

    /** Idempotent: a missing or unknown cookie still answers 204 and clears. */
    logout: Handler = async (req, res) => {
        const token = cookieOf(req, REFRESH_COOKIE);
        if (token !== undefined) {
            await SessionService.revoke(token);
        }
        clearAuthCookies(res);
        sendNoContent(res);
    };

    /** Shared by every way of signing in: one session, the same two cookies. */
    private static async signIn(req: Request, res: Response, user: User): Promise<void> {
        const session = await SessionService.issue(user, req.header('user-agent') ?? null);
        setAuthCookies(res, session);
    }
}
